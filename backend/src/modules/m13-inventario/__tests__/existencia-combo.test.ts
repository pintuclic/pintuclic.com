import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { ExistenciaComboService } from '../services/existencia-combo.service';

/**
 * ExistenciaComboPort (R15) contra PostgreSQL real: descontar y reponer la existencia de los combos con una
 * transacción real, sin pasar por HTTP (lo invoca M08, no un navegador). Se activa con `M01_TEST_DATABASE_URL`.
 */
const URL_BD = process.env.M01_TEST_DATABASE_URL;
const ALEATORIO = Math.random().toString(36).slice(2, 8);
const PREFIJO = `ZZ-XC-${ALEATORIO}`;

describe.skipIf(URL_BD === undefined)('M13 · ExistenciaComboPort (PostgreSQL)', () => {
  let prisma: (typeof import('../../../core/db/client'))['prisma'];
  let servicio: ExistenciaComboService;
  let contador = 0;
  const v = { comboA: 0, comboB: 0, comun: 0 };
  const stock = { comboA: 5, comboB: 3, comun: 7 };
  const ref = (id: string) => ({ tipo: 'orden' as const, id: `${PREFIJO}-${id}` });
  const referencia = (): ReturnType<typeof ref> => ref(`O${++contador}`);

  const existencia = async (id: number): Promise<number> =>
    (await prisma.variante.findUniqueOrThrow({ where: { idVariante: id } })).existenciaReferencial;
  const historial = (id: number) =>
    prisma.ajusteInventario.findMany({ where: { idVariante: id, origen: 'orden' }, orderBy: { idAjuste: 'asc' } });
  const idsVariantes = (): number[] => Object.values(v);

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_BD ?? '';
    ({ prisma } = await import('../../../core/db/client.js'));
    const { ExistenciaComboService: Servicio } = await import('../services/existencia-combo.service.js');
    const { ExistenciaComboRepository } = await import('../repositories/existencia-combo.repository.js');
    servicio = new Servicio(new ExistenciaComboRepository());

    const categoria = await prisma.categoria.create({ data: { nombre: `${PREFIJO}-cat` } });
    const subcategoria = await prisma.subcategoria.create({
      data: { idCategoria: categoria.idCategoria, nombre: `${PREFIJO}-sub` },
    });
    const marca = await prisma.marca.create({
      data: { nombre: `${PREFIJO}-marca`, logotipo: Buffer.from('x'), logotipoMimeType: 'image/png' },
    });
    const tipo = await prisma.tipoMedida.create({ data: { nombre: `${PREFIJO}-tipo`, abreviatura: `X${ALEATORIO}` } });
    const medida = await prisma.medida.create({
      data: { idTipoMedida: tipo.idTipoMedida, nombre: `${PREFIJO}-und`, valor: 1 },
    });
    const crear = async (nombre: string, esCombo: boolean, sku: string): Promise<number> => {
      const p = await prisma.producto.create({
        data: { idMarca: marca.idMarca, idSubcategoria: subcategoria.idSubcategoria, nombre, esCombo },
      });
      return (
        await prisma.variante.create({
          data: { idProducto: p.idProducto, idMedida: medida.idMedida, sku, precioVigente: 1000 },
        })
      ).idVariante;
    };
    v.comboA = await crear(`${PREFIJO}-comboA`, true, `${PREFIJO}-A`);
    v.comboB = await crear(`${PREFIJO}-comboB`, true, `${PREFIJO}-B`);
    // Una sola medida por producto: el producto común usa otra para no repetir (producto, medida) entre productos.
    v.comun = await crear(`${PREFIJO}-comun`, false, `${PREFIJO}-C`);
  });

  beforeEach(async () => {
    await prisma.ajusteInventario.deleteMany({ where: { idVariante: { in: idsVariantes() } } });
    for (const k of Object.keys(v) as Array<keyof typeof v>) {
      await prisma.variante.update({ where: { idVariante: v[k] }, data: { existenciaReferencial: stock[k] } });
    }
  });

  afterAll(async () => {
    await prisma.ajusteInventario.deleteMany({ where: { idVariante: { in: idsVariantes() } } });
    await prisma.variante.deleteMany({ where: { idVariante: { in: idsVariantes() } } });
    const marcas = await prisma.marca.findMany({ where: { nombre: { startsWith: PREFIJO } } });
    await prisma.producto.deleteMany({ where: { idMarca: { in: marcas.map((m) => m.idMarca) } } });
    await prisma.marca.deleteMany({ where: { idMarca: { in: marcas.map((m) => m.idMarca) } } });
    await prisma.medida.deleteMany({ where: { nombre: { startsWith: PREFIJO } } });
    await prisma.tipoMedida.deleteMany({ where: { nombre: { startsWith: PREFIJO } } });
    await prisma.subcategoria.deleteMany({ where: { categoria: { nombre: { startsWith: PREFIJO } } } });
    await prisma.categoria.deleteMany({ where: { nombre: { startsWith: PREFIJO } } });
    await prisma.$disconnect();
  });

  describe('descontar', () => {
    it('baja la existencia del combo y deja el historial del sistema con la referencia de la orden', async () => {
      const r = ref('hist');
      expect(await servicio.descontar([{ idVariante: v.comboA, cantidad: 2 }], r)).toEqual({ ok: true });
      expect(await existencia(v.comboA)).toBe(3);
      const filas = await historial(v.comboA);
      expect(filas).toHaveLength(1);
      expect(filas[0]).toMatchObject({
        existenciaAnterior: 5,
        existenciaNueva: 3,
        motivo: 'venta',
        origen: 'orden',
        referencia: r.id,
        idUsuario: null,
        idCarga: null,
      });
    });

    it('permite llegar justo a cero y nunca por debajo (CA-CAT-13-05)', async () => {
      expect(await servicio.descontar([{ idVariante: v.comboA, cantidad: 5 }], referencia())).toEqual({ ok: true });
      expect(await existencia(v.comboA)).toBe(0);
      const r = await servicio.descontar([{ idVariante: v.comboA, cantidad: 1 }], referencia());
      expect(r).toEqual({ ok: false, idVariante: v.comboA, existenciaDisponible: 0 });
      expect(await existencia(v.comboA)).toBe(0);
    });

    it('solo mueve combos: un producto común y una variante que no existe se ignoran', async () => {
      const r = await servicio.descontar(
        [
          { idVariante: v.comun, cantidad: 4 },
          { idVariante: 2147483000, cantidad: 1 },
          { idVariante: v.comboB, cantidad: 1 },
        ],
        referencia(),
      );
      expect(r).toEqual({ ok: true });
      expect(await existencia(v.comun)).toBe(7);
      expect(await historial(v.comun)).toHaveLength(0);
      expect(await existencia(v.comboB)).toBe(2);
    });

    it('es todo o nada: si una línea no alcanza no se mueve ninguna y se informa cuál (P6)', async () => {
      const r = await servicio.descontar(
        [
          { idVariante: v.comboA, cantidad: 2 },
          { idVariante: v.comboB, cantidad: 4 },
        ],
        referencia(),
      );
      expect(r).toEqual({ ok: false, idVariante: v.comboB, existenciaDisponible: 3 });
      expect(await existencia(v.comboA)).toBe(5);
      expect(await existencia(v.comboB)).toBe(3);
      expect(await historial(v.comboA)).toHaveLength(0);
    });

    it('suma las líneas repetidas de una misma variante antes de comprobar', async () => {
      const r = await servicio.descontar(
        [
          { idVariante: v.comboB, cantidad: 2 },
          { idVariante: v.comboB, cantidad: 2 },
        ],
        referencia(),
      );
      expect(r).toEqual({ ok: false, idVariante: v.comboB, existenciaDisponible: 3 });
      expect(
        await servicio.descontar(
          [
            { idVariante: v.comboB, cantidad: 1 },
            { idVariante: v.comboB, cantidad: 2 },
          ],
          referencia(),
        ),
      ).toEqual({
        ok: true,
      });
      expect(await existencia(v.comboB)).toBe(0);
      expect(await historial(v.comboB)).toHaveLength(1);
    });

    it('es idempotente: repetir la misma referencia no descuenta otra vez ni duplica el historial', async () => {
      const r = referencia();
      const lineas = [{ idVariante: v.comboA, cantidad: 2 }];
      await servicio.descontar(lineas, r);
      expect(await servicio.descontar(lineas, r)).toEqual({ ok: true });
      expect(await existencia(v.comboA)).toBe(3);
      expect(await historial(v.comboA)).toHaveLength(1);
      // Otra orden sí descuenta.
      await servicio.descontar(lineas, referencia());
      expect(await existencia(v.comboA)).toBe(1);
    });

    it('con la misma referencia solo repite lo ya hecho: una variante nueva en el reintento sí se descuenta', async () => {
      const r = referencia();
      await servicio.descontar([{ idVariante: v.comboA, cantidad: 1 }], r);
      await servicio.descontar(
        [
          { idVariante: v.comboA, cantidad: 1 },
          { idVariante: v.comboB, cantidad: 1 },
        ],
        r,
      );
      expect([await existencia(v.comboA), await existencia(v.comboB)]).toEqual([4, 2]);
    });

    it('con varias órdenes a la vez nunca vende más de lo que hay (CA-CAT-13-05)', async () => {
      await prisma.variante.update({ where: { idVariante: v.comboA }, data: { existenciaReferencial: 2 } });
      const resultados = await Promise.all(
        Array.from({ length: 6 }, (_u, i) =>
          servicio.descontar([{ idVariante: v.comboA, cantidad: 1 }], ref(`par-${i}`)),
        ),
      );
      expect(resultados.filter((r) => r.ok)).toHaveLength(2);
      expect(resultados.filter((r) => !r.ok)).toHaveLength(4);
      expect(await existencia(v.comboA)).toBe(0);
      expect(await historial(v.comboA)).toHaveLength(2);
    });

    it('dos órdenes que piden los mismos combos en distinto orden no se bloquean entre sí', async () => {
      const a = servicio.descontar(
        [
          { idVariante: v.comboA, cantidad: 1 },
          { idVariante: v.comboB, cantidad: 1 },
        ],
        ref('cruce-1'),
      );
      const b = servicio.descontar(
        [
          { idVariante: v.comboB, cantidad: 1 },
          { idVariante: v.comboA, cantidad: 1 },
        ],
        ref('cruce-2'),
      );
      expect(await Promise.all([a, b])).toEqual([{ ok: true }, { ok: true }]);
      expect([await existencia(v.comboA), await existencia(v.comboB)]).toEqual([3, 1]);
    });

    it('dentro de la transacción de quien llama: se confirma con ella y se deshace si ella falla', async () => {
      await expect(
        prisma.$transaction(async (tx) => {
          expect(await servicio.descontar([{ idVariante: v.comboA, cantidad: 2 }], referencia(), tx)).toEqual({
            ok: true,
          });
          expect(await tx.variante.findUniqueOrThrow({ where: { idVariante: v.comboA } })).toMatchObject({
            existenciaReferencial: 3,
          });
          throw new Error('la orden no se pudo crear');
        }),
      ).rejects.toThrow('la orden no se pudo crear');
      expect(await existencia(v.comboA)).toBe(5);
      expect(await historial(v.comboA)).toHaveLength(0);

      await prisma.$transaction(async (tx) => {
        await servicio.descontar([{ idVariante: v.comboA, cantidad: 2 }], referencia(), tx);
      });
      expect(await existencia(v.comboA)).toBe(3);
    });

    it('si no alcanza dentro de la transacción de quien llama, tampoco deja nada escrito', async () => {
      await prisma.$transaction(async (tx) => {
        const r = await servicio.descontar(
          [
            { idVariante: v.comboA, cantidad: 1 },
            { idVariante: v.comboB, cantidad: 9 },
          ],
          referencia(),
          tx,
        );
        expect(r.ok).toBe(false);
      });
      expect([await existencia(v.comboA), await existencia(v.comboB)]).toEqual([5, 3]);
    });

    it.each([
      ['cantidad cero', [{ idVariante: 1, cantidad: 0 }]],
      ['cantidad negativa', [{ idVariante: 1, cantidad: -1 }]],
      ['cantidad decimal', [{ idVariante: 1, cantidad: 1.5 }]],
      ['variante inválida', [{ idVariante: 0, cantidad: 1 }]],
    ])('rechaza %s con PARAMETRO_INVALIDO y no escribe', async (_n, lineas) => {
      await expect(servicio.descontar(lineas, referencia())).rejects.toMatchObject({
        code: 'PARAMETRO_INVALIDO',
        status: 400,
      });
      expect(await existencia(v.comboA)).toBe(5);
    });

    it('rechaza una referencia vacía y un contexto que no es una transacción', async () => {
      const lineas = [{ idVariante: v.comboA, cantidad: 1 }];
      await expect(servicio.descontar(lineas, { tipo: 'orden', id: '' })).rejects.toMatchObject({
        code: 'PARAMETRO_INVALIDO',
      });
      await expect(servicio.descontar(lineas, referencia(), 'no soy una transacción')).rejects.toMatchObject({
        code: 'PARAMETRO_INVALIDO',
      });
      await expect(servicio.descontar(lineas, referencia(), prisma)).rejects.toMatchObject({
        code: 'PARAMETRO_INVALIDO',
      });
      expect(await existencia(v.comboA)).toBe(5);
    });

    it('una lista vacía no hace nada', async () => {
      expect(await servicio.descontar([], referencia())).toEqual({ ok: true });
    });
  });

  describe('reponer', () => {
    it('devuelve lo que la orden descontó y deja su historial (CA-CAT-13-07)', async () => {
      const r = ref('cancelada');
      await servicio.descontar([{ idVariante: v.comboA, cantidad: 3 }], r);
      await servicio.reponer([{ idVariante: v.comboA, cantidad: 3 }], r);
      expect(await existencia(v.comboA)).toBe(5);
      const filas = await historial(v.comboA);
      expect(filas.map((f) => [f.motivo, f.existenciaAnterior, f.existenciaNueva])).toEqual([
        ['venta', 5, 2],
        ['devolucion', 2, 5],
      ]);
      expect(filas[1]).toMatchObject({ origen: 'orden', referencia: r.id, idUsuario: null });
    });

    it('es idempotente: cancelar dos veces no devuelve dos veces', async () => {
      const r = referencia();
      await servicio.descontar([{ idVariante: v.comboA, cantidad: 2 }], r);
      await servicio.reponer([{ idVariante: v.comboA, cantidad: 2 }], r);
      await servicio.reponer([{ idVariante: v.comboA, cantidad: 2 }], r);
      expect(await existencia(v.comboA)).toBe(5);
      expect(await historial(v.comboA)).toHaveLength(2);
    });

    it('sin un descuento previo de esa orden no hay nada que devolver (no inventa existencia)', async () => {
      await servicio.reponer([{ idVariante: v.comboA, cantidad: 2 }], referencia());
      expect(await existencia(v.comboA)).toBe(5);
      expect(await historial(v.comboA)).toHaveLength(0);
    });

    it('nunca devuelve más de lo que esa orden descontó', async () => {
      const r = referencia();
      await servicio.descontar([{ idVariante: v.comboA, cantidad: 2 }], r);
      await servicio.reponer([{ idVariante: v.comboA, cantidad: 10 }], r);
      expect(await existencia(v.comboA)).toBe(5);
    });

    it('solo repone combos y respeta la existencia que haya en ese momento', async () => {
      const r = referencia();
      await servicio.descontar([{ idVariante: v.comboA, cantidad: 2 }], r);
      // Mientras tanto alguien ajustó el inventario a mano.
      await prisma.variante.update({ where: { idVariante: v.comboA }, data: { existenciaReferencial: 10 } });
      await servicio.reponer(
        [
          { idVariante: v.comboA, cantidad: 2 },
          { idVariante: v.comun, cantidad: 2 },
        ],
        r,
      );
      expect(await existencia(v.comboA)).toBe(12);
      expect(await existencia(v.comun)).toBe(7);
    });

    it('dentro de la transacción de quien llama se deshace con ella', async () => {
      const r = referencia();
      await servicio.descontar([{ idVariante: v.comboA, cantidad: 2 }], r);
      await expect(
        prisma.$transaction(async (tx) => {
          await servicio.reponer([{ idVariante: v.comboA, cantidad: 2 }], r, tx);
          throw new Error('falló la cancelación');
        }),
      ).rejects.toThrow('falló la cancelación');
      expect(await existencia(v.comboA)).toBe(3);
    });
  });

  describe('base de datos', () => {
    it('el índice único impide repetir el movimiento de una orden aunque se salte el servicio', async () => {
      const r = ref('unico');
      const dato = {
        idVariante: v.comboA,
        existenciaAnterior: 5,
        existenciaNueva: 4,
        motivo: 'venta' as const,
        origen: 'orden' as const,
        referencia: r.id,
      };
      await prisma.ajusteInventario.create({ data: dato });
      await expect(prisma.ajusteInventario.create({ data: dato })).rejects.toThrow();
    });
  });
});
