import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { NombreActor, ServidorPrueba } from './helpers/servidor-prueba';

/**
 * M13 (todo el contrato) contra PostgreSQL real, por HTTP. Se activa con `M01_TEST_DATABASE_URL`
 * (la misma base de pruebas que M01); sin ella se omite (CI sin base de datos).
 */
const URL_BD = process.env.M01_TEST_DATABASE_URL;
const ALEATORIO = Math.random().toString(36).slice(2, 8);
const PREFIJO = `ZZ-INV-${ALEATORIO}`;

interface Dato {
  [clave: string]: unknown;
}

describe.skipIf(URL_BD === undefined)('M13 · inventario referencial (HTTP + PostgreSQL)', () => {
  let servidor: ServidorPrueba;
  let prisma: (typeof import('../../../core/db/client'))['prisma'];
  let InventarioRepository: (typeof import('../repositories/inventario.repository'))['InventarioRepository'];
  const auditoria = { registrarAccesoDenegado: vi.fn() };

  const ids = { admin: 0, lector: 0, editor: 0, cliente: 987_654_321 };
  const v = { v1: 0, v2: 0, v3: 0, v4: 0, v5: 0 };
  const sku = {
    v1: `${PREFIJO}-V1`,
    v2: `${PREFIJO}-V2`,
    v3: `=${PREFIJO}-V3`,
    v4: `${PREFIJO}-V4`,
    v5: `${PREFIJO}-V5`,
  };
  const nombres = {
    marcaA: `Marca Ñandú ${ALEATORIO}`,
    marcaB: `Marca Beta ${ALEATORIO}`,
    pA1: 'Vinilo Mate',
    pA2: '=Esmalte Brillante',
    pB1: 'Laca',
    galon: `Galón ${ALEATORIO}`,
    cuarto: `Cuarto ${ALEATORIO}`,
  };
  const marcaId = { a: 0, b: 0 };
  const EXISTENCIA_INICIAL = { v1: 10, v2: 0, v3: 5, v4: 3, v5: 8 };

  const como = (actor: NombreActor | null) => (m: 'GET' | 'POST' | 'PUT', ruta: string, cuerpo?: unknown) =>
    servidor.peticion(actor, m, ruta, cuerpo);
  const admin = como('admin');
  const editor = como('editor');
  const dato = (r: { cuerpo: { data?: unknown } }): Dato => r.cuerpo.data as Dato;
  const lista = (r: { cuerpo: { data?: unknown } }): Dato[] => r.cuerpo.data as Dato[];
  const existenciaEnBd = async (id: number): Promise<number> =>
    (await prisma.variante.findUniqueOrThrow({ where: { idVariante: id } })).existenciaReferencial;
  const ajustesDe = (id: number) =>
    prisma.ajusteInventario.findMany({ where: { idVariante: id }, orderBy: { idAjuste: 'asc' } });
  const idsVariantes = (): number[] => Object.values(v);

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_BD ?? '';
    ({ prisma } = await import('../../../core/db/client.js'));
    ({ InventarioRepository } = await import('../repositories/inventario.repository.js'));
    const { levantarServidor } = await import('./helpers/servidor-prueba.js');

    const usuario = async (rol: string): Promise<number> =>
      (
        await prisma.usuario.create({
          data: { nombre: `Persona ${rol} ${ALEATORIO}`, correo: `${rol}-${ALEATORIO}@m13.test`, contrasena: 'x' },
        })
      ).idUsuario;
    ids.admin = await usuario('admin');
    ids.lector = await usuario('lector');
    ids.editor = await usuario('editor');
    servidor = await levantarServidor(auditoria, ids);

    const categoria = await prisma.categoria.create({ data: { nombre: `${PREFIJO}-cat` } });
    const subcategoria = await prisma.subcategoria.create({
      data: { idCategoria: categoria.idCategoria, nombre: `${PREFIJO}-sub` },
    });
    const logotipo = { logotipo: Buffer.from('x'), logotipoMimeType: 'image/png' };
    marcaId.a = (await prisma.marca.create({ data: { nombre: nombres.marcaA, ...logotipo } })).idMarca;
    marcaId.b = (await prisma.marca.create({ data: { nombre: nombres.marcaB, ...logotipo } })).idMarca;
    const tipo = await prisma.tipoMedida.create({
      data: { nombre: `${PREFIJO}-tipo`, abreviatura: `Z${ALEATORIO}` },
    });
    const medida = async (nombre: string, valor: number): Promise<number> =>
      (await prisma.medida.create({ data: { idTipoMedida: tipo.idTipoMedida, nombre, valor } })).idMedida;
    const galon = await medida(nombres.galon, 1);
    const cuarto = await medida(nombres.cuarto, 0.25);
    const producto = async (idMarca: number, nombre: string): Promise<number> =>
      (await prisma.producto.create({ data: { idMarca, idSubcategoria: subcategoria.idSubcategoria, nombre } }))
        .idProducto;
    const pA1 = await producto(marcaId.a, nombres.pA1);
    const pA2 = await producto(marcaId.a, nombres.pA2);
    const pB1 = await producto(marcaId.b, nombres.pB1);
    const variante = async (idProducto: number, idMedida: number, codigo: string, estado: 'activo' | 'inactivo') =>
      (await prisma.variante.create({ data: { idProducto, idMedida, sku: codigo, precioVigente: 1000, estado } }))
        .idVariante;
    v.v1 = await variante(pA1, galon, sku.v1, 'activo');
    v.v2 = await variante(pA1, cuarto, sku.v2, 'activo');
    v.v3 = await variante(pA2, galon, sku.v3, 'activo');
    v.v4 = await variante(pB1, galon, sku.v4, 'inactivo');
    v.v5 = await variante(pB1, cuarto, sku.v5, 'activo');
  });

  beforeEach(async () => {
    vi.restoreAllMocks();
    auditoria.registrarAccesoDenegado.mockClear();
    await prisma.ajusteInventario.deleteMany({ where: { idVariante: { in: idsVariantes() } } });
    for (const clave of Object.keys(v) as Array<keyof typeof v>) {
      await prisma.variante.update({
        where: { idVariante: v[clave] },
        data: { existenciaReferencial: EXISTENCIA_INICIAL[clave] },
      });
    }
  });

  afterAll(async () => {
    await prisma.ajusteInventario.deleteMany({ where: { idVariante: { in: idsVariantes() } } });
    await prisma.variante.deleteMany({ where: { idVariante: { in: idsVariantes() } } });
    const marcas = await prisma.marca.findMany({ where: { nombre: { in: [nombres.marcaA, nombres.marcaB] } } });
    await prisma.producto.deleteMany({ where: { idMarca: { in: marcas.map((m) => m.idMarca) } } });
    await prisma.marca.deleteMany({ where: { idMarca: { in: marcas.map((m) => m.idMarca) } } });
    await prisma.medida.deleteMany({ where: { nombre: { in: [nombres.galon, nombres.cuarto] } } });
    await prisma.tipoMedida.deleteMany({ where: { nombre: `${PREFIJO}-tipo` } });
    await prisma.subcategoria.deleteMany({ where: { nombre: `${PREFIJO}-sub` } });
    await prisma.categoria.deleteMany({ where: { nombre: `${PREFIJO}-cat` } });
    await prisma.usuario.deleteMany({ where: { idUsuario: { in: [ids.admin, ids.lector, ids.editor] } } });
    await servidor.cerrar();
    await prisma.$disconnect();
  });

  describe('autorización (R13)', () => {
    const rutas: Array<[string, 'GET' | 'POST' | 'PUT', string, unknown]> = [
      ['resumen', 'GET', '/resumen', undefined],
      ['listar', 'GET', '/variantes', undefined],
      ['obtener', 'GET', '/variantes/1', undefined],
      ['historial', 'GET', '/historial', undefined],
      ['plantilla', 'GET', '/plantilla', undefined],
      ['ajustar', 'PUT', '/variantes/1/existencia', { existencia: 1 }],
      ['previsualizar', 'POST', '/cargas/previsualizar', { filas: [{ sku: 'a', existencia: 1 }] }],
      ['aplicar', 'POST', '/cargas/aplicar', { idCarga: randomUUID(), filas: [{ sku: 'a', existencia: 1 }] }],
    ];

    it.each(rutas)('%s: sin sesión responde 404 RECURSO_NO_DISPONIBLE', async (_n, metodo, ruta, cuerpo) => {
      const r = await servidor.peticion(null, metodo, ruta, cuerpo);
      expect([r.status, r.cuerpo.error?.code]).toEqual([404, 'RECURSO_NO_DISPONIBLE']);
    });

    it.each(rutas)('%s: un cliente sin permisos recibe la misma respuesta 404', async (_n, metodo, ruta, cuerpo) => {
      const r = await servidor.peticion('cliente', metodo, ruta, cuerpo);
      expect([r.status, r.cuerpo.error?.code]).toEqual([404, 'RECURSO_NO_DISPONIBLE']);
    });

    it('quien solo puede ver (catalogo.ver) consulta pero no ajusta ni carga', async () => {
      const lector = como('lector');
      expect((await lector('GET', '/resumen')).status).toBe(200);
      expect((await lector('GET', `/variantes/${v.v1}`)).status).toBe(200);
      expect((await lector('PUT', `/variantes/${v.v1}/existencia`, { existencia: 99 })).status).toBe(404);
      const carga = { filas: [{ sku: sku.v1, existencia: 99 }] };
      expect((await lector('POST', '/cargas/previsualizar', carga)).status).toBe(404);
      expect((await lector('POST', '/cargas/aplicar', { idCarga: randomUUID(), ...carga })).status).toBe(404);
      expect(await existenciaEnBd(v.v1)).toBe(10);
      expect(await prisma.ajusteInventario.count({ where: { idVariante: v.v1 } })).toBe(0);
    });

    it('registra los accesos denegados en la auditoría', async () => {
      await servidor.peticion('cliente', 'GET', '/resumen');
      expect(auditoria.registrarAccesoDenegado).toHaveBeenCalled();
    });
  });

  describe('lectura', () => {
    const listar = (consulta = '') =>
      admin('GET', `/variantes?busqueda=${encodeURIComponent(PREFIJO)}&limite=100${consulta}`);
    const idsDe = (r: { cuerpo: { data?: unknown } }): unknown[] => lista(r).map((f) => f.idVariante);

    it('lista solo las variantes activas por defecto, ordenadas por marca, producto y medida (R11)', async () => {
      const r = await listar();
      expect(r.status).toBe(200);
      expect(idsDe(r)).toEqual([v.v5, v.v3, v.v2, v.v1]);
      expect(lista(r)[0]).toMatchObject({
        idVariante: v.v5,
        marca: nombres.marcaB,
        producto: nombres.pB1,
        medida: nombres.cuarto,
        sku: sku.v5,
        existenciaReferencial: 8,
        estadoExistencia: 'disponible',
        estadoVariante: 'activo',
        ultimoAjuste: null,
      });
    });

    it('incluirInactivas=true suma las inactivas y las marca como tales', async () => {
      const r = await listar('&incluirInactivas=true');
      expect(idsDe(r)).toEqual([v.v5, v.v4, v.v3, v.v2, v.v1]);
      expect(lista(r).find((f) => f.idVariante === v.v4)).toMatchObject({ estadoVariante: 'inactivo' });
      expect(idsDe(await listar('&incluirInactivas=false'))).toEqual([v.v5, v.v3, v.v2, v.v1]);
    });

    it('"agotado" se deriva de la existencia 0 y se puede filtrar (R12)', async () => {
      const agotadas = await listar('&estadoExistencia=agotado');
      expect(idsDe(agotadas)).toEqual([v.v2]);
      expect(lista(agotadas)[0]).toMatchObject({ existenciaReferencial: 0, estadoExistencia: 'agotado' });
      expect(idsDe(await listar('&estadoExistencia=disponible'))).toEqual([v.v5, v.v3, v.v1]);
    });

    it('filtra por marca', async () => {
      expect(idsDe(await listar(`&idMarca=${marcaId.b}`))).toEqual([v.v5]);
      expect(idsDe(await listar(`&idMarca=${marcaId.a}`))).toEqual([v.v3, v.v2, v.v1]);
    });

    it('busca por producto, marca, medida o SKU sin distinguir mayúsculas', async () => {
      const buscar = async (texto: string) =>
        idsDe(await admin('GET', `/variantes?busqueda=${encodeURIComponent(texto)}&limite=100`)).filter((id) =>
          idsVariantes().includes(id as number),
        );
      expect(await buscar('vinilo MATE')).toEqual([v.v2, v.v1]);
      expect(await buscar(`MARCA BETA ${ALEATORIO}`)).toEqual([v.v5]);
      expect(await buscar(`cuarto ${ALEATORIO}`)).toEqual([v.v5, v.v2]);
      expect(await buscar(sku.v1.toLowerCase())).toEqual([v.v1]);
    });

    it('pagina y devuelve el total', async () => {
      const r = await admin('GET', `/variantes?busqueda=${encodeURIComponent(PREFIJO)}&limite=2&pagina=2`);
      expect(idsDe(r)).toEqual([v.v2, v.v1]);
      expect(r.cuerpo.pagination).toEqual({ pagina: 2, limite: 2, total: 4, totalPaginas: 2 });
    });

    it.each([
      ['límite mayor de 100', 'limite=101'],
      ['página 0', 'pagina=0'],
      ['marca no numérica', 'idMarca=abc'],
      ['estado de existencia desconocido', 'estadoExistencia=poco'],
      ['incluirInactivas que no es true/false', 'incluirInactivas=si'],
    ])('rechaza %s con 400 PARAMETRO_INVALIDO', async (_n, consulta) => {
      const r = await admin('GET', `/variantes?${consulta}`);
      expect([r.status, r.cuerpo.error?.code]).toEqual([400, 'PARAMETRO_INVALIDO']);
    });

    it('obtiene una variante (también inactiva) y responde 404 / 400 si no existe o el id es inválido', async () => {
      expect(dato(await admin('GET', `/variantes/${v.v4}`))).toMatchObject({
        idVariante: v.v4,
        estadoVariante: 'inactivo',
      });
      expect((await admin('GET', '/variantes/2147483000')).cuerpo.error?.code).toBe('RECURSO_NO_DISPONIBLE');
      expect((await admin('GET', '/variantes/abc')).cuerpo.error?.code).toBe('PARAMETRO_INVALIDO');
    });

    it('el resumen cuenta las variantes activas, las agotadas y las que nunca se ajustaron', async () => {
      const antes = dato(await admin('GET', '/resumen'));
      await admin('PUT', `/variantes/${v.v2}/existencia`, { existencia: 4 });
      const despues = dato(await admin('GET', '/resumen'));
      expect(despues.totalVariantes).toBe(antes.totalVariantes);
      expect(despues.agotadas).toBe((antes.agotadas as number) - 1);
      expect(despues.disponibles).toBe((antes.disponibles as number) + 1);
      expect(despues.sinAjustes).toBe((antes.sinAjustes as number) - 1);
      expect(typeof despues.ultimoAjuste).toBe('string');
      expect((despues.totalVariantes as number) >= 4).toBe(true);
    });
  });

  describe('ajuste manual (R1–R4)', () => {
    const ajustar = (id: number, cuerpo: unknown, quien = editor) =>
      quien('PUT', `/variantes/${id}/existencia`, cuerpo);

    it('cambia la existencia y deja el historial con quién, cuándo, antes y después (R3)', async () => {
      const r = await ajustar(v.v1, { existencia: 25, motivo: 'ingreso_mercancia', nota: 'Llegó pedido' });
      expect(r.status).toBe(200);
      const { item, ajuste } = dato(r) as { item: Dato; ajuste: Dato };
      expect(item).toMatchObject({ idVariante: v.v1, existenciaReferencial: 25, estadoExistencia: 'disponible' });
      expect(typeof item.ultimoAjuste).toBe('string');
      expect(ajuste).toMatchObject({
        idVariante: v.v1,
        marca: nombres.marcaA,
        producto: nombres.pA1,
        medida: nombres.galon,
        sku: sku.v1,
        existenciaAnterior: 10,
        existenciaNueva: 25,
        motivo: 'ingreso_mercancia',
        nota: 'Llegó pedido',
        origen: 'manual',
        idCarga: null,
        idUsuario: ids.editor,
        usuario: `Persona editor ${ALEATORIO}`,
      });
      expect(await existenciaEnBd(v.v1)).toBe(25);
      expect(await ajustesDe(v.v1)).toHaveLength(1);
    });

    it('el motivo por defecto es "correccion" y la nota es opcional', async () => {
      const { ajuste } = dato(await ajustar(v.v1, { existencia: 11 })) as { ajuste: Dato };
      expect(ajuste).toMatchObject({ motivo: 'correccion', nota: null });
    });

    it('un cambio al mismo valor no escribe ni deja historial; ajuste es null (R2)', async () => {
      const r = await ajustar(v.v1, { existencia: 10 });
      expect(r.status).toBe(200);
      expect(dato(r)).toMatchObject({ item: { existenciaReferencial: 10 }, ajuste: null });
      expect(await ajustesDe(v.v1)).toHaveLength(0);
    });

    it('llegar a 0 la marca como agotada sin cambiar el estado administrativo de la variante (R12)', async () => {
      const { item } = dato(await ajustar(v.v1, { existencia: 0 })) as { item: Dato };
      expect(item).toMatchObject({ existenciaReferencial: 0, estadoExistencia: 'agotado', estadoVariante: 'activo' });
      const enBd = await prisma.variante.findUniqueOrThrow({ where: { idVariante: v.v1 } });
      expect(enBd.estado).toBe('activo');
    });

    it('permite ajustar una variante inactiva (R11) y acepta el máximo 2 147 483 647 (R1)', async () => {
      expect((await ajustar(v.v4, { existencia: 2_147_483_647 })).status).toBe(200);
      expect(await existenciaEnBd(v.v4)).toBe(2_147_483_647);
    });

    it('el usuario sale de la sesión: un idUsuario en el cuerpo se ignora', async () => {
      const { ajuste } = dato(await ajustar(v.v1, { existencia: 12, idUsuario: ids.admin })) as { ajuste: Dato };
      expect(ajuste.idUsuario).toBe(ids.editor);
    });

    it('existenciaEsperada correcta aplica el cambio (R4)', async () => {
      expect((await ajustar(v.v1, { existencia: 15, existenciaEsperada: 10 })).status).toBe(200);
    });

    it('existenciaEsperada desactualizada responde 409 CONFLICTO_EXISTENCIA con la existencia actual y no escribe (R4)', async () => {
      const r = await ajustar(v.v1, { existencia: 15, existenciaEsperada: 7 });
      expect(r.status).toBe(409);
      expect(r.cuerpo.error).toMatchObject({ code: 'CONFLICTO_EXISTENCIA', details: { existenciaActual: 10 } });
      expect(await existenciaEnBd(v.v1)).toBe(10);
      expect(await ajustesDe(v.v1)).toHaveLength(0);
    });

    it('dos ajustes simultáneos con la misma existenciaEsperada: uno aplica y el otro recibe 409', async () => {
      const [a, b] = await Promise.all([
        ajustar(v.v1, { existencia: 11, existenciaEsperada: 10 }),
        ajustar(v.v1, { existencia: 12, existenciaEsperada: 10 }, admin),
      ]);
      expect([a.status, b.status].sort()).toEqual([200, 409]);
      expect(await ajustesDe(v.v1)).toHaveLength(1);
      expect([11, 12]).toContain(await existenciaEnBd(v.v1));
    });

    it.each([
      ['existencia negativa', { existencia: -1 }],
      ['existencia decimal', { existencia: 1.5 }],
      ['existencia por encima del máximo', { existencia: 2_147_483_648 }],
      ['existencia ausente', {}],
      ['existencia como texto', { existencia: '5' }],
      ['existenciaEsperada negativa', { existencia: 1, existenciaEsperada: -1 }],
      ['motivo desconocido', { existencia: 1, motivo: 'regalo' }],
      ['motivo carga_masiva a mano', { existencia: 1, motivo: 'carga_masiva' }],
      ['nota vacía', { existencia: 1, nota: '   ' }],
      ['nota de más de 500 caracteres', { existencia: 1, nota: 'x'.repeat(501) }],
    ])('rechaza %s con 400 PARAMETRO_INVALIDO y no escribe', async (_n, cuerpo) => {
      const r = await ajustar(v.v1, cuerpo);
      expect([r.status, r.cuerpo.error?.code]).toEqual([400, 'PARAMETRO_INVALIDO']);
      expect(await existenciaEnBd(v.v1)).toBe(10);
      expect(await ajustesDe(v.v1)).toHaveLength(0);
    });

    it('responde 404 si la variante no existe y 400 si el id no es válido', async () => {
      expect((await ajustar(2147483000, { existencia: 1 })).cuerpo.error?.code).toBe('RECURSO_NO_DISPONIBLE');
      expect((await editor('PUT', '/variantes/abc/existencia', { existencia: 1 })).cuerpo.error?.code).toBe(
        'PARAMETRO_INVALIDO',
      );
    });

    it('no toca nada más de la variante (precio, SKU, estado)', async () => {
      const antes = await prisma.variante.findUniqueOrThrow({ where: { idVariante: v.v1 } });
      await ajustar(v.v1, { existencia: 77 });
      const despues = await prisma.variante.findUniqueOrThrow({ where: { idVariante: v.v1 } });
      expect({ ...despues, existenciaReferencial: 0 }).toEqual({ ...antes, existenciaReferencial: 0 });
    });
  });

  describe('historial (R14, D5)', () => {
    const historial = (consulta = '') => admin('GET', `/historial?${consulta}`);

    it('lista lo más reciente primero y filtra por variante', async () => {
      await editor('PUT', `/variantes/${v.v1}/existencia`, { existencia: 11 });
      await editor('PUT', `/variantes/${v.v1}/existencia`, { existencia: 12, motivo: 'salida' });
      await editor('PUT', `/variantes/${v.v2}/existencia`, { existencia: 1 });
      const r = await historial(`idVariante=${v.v1}`);
      expect(lista(r).map((a) => [a.existenciaAnterior, a.existenciaNueva])).toEqual([
        [11, 12],
        [10, 11],
      ]);
      expect(r.cuerpo.pagination).toMatchObject({ total: 2 });
    });

    it('filtra por origen y por carga, y pagina', async () => {
      const idCarga = randomUUID();
      await editor('PUT', `/variantes/${v.v1}/existencia`, { existencia: 11 });
      await editor('POST', '/cargas/aplicar', {
        idCarga,
        filas: [
          { sku: sku.v2, existencia: 2 },
          { sku: sku.v5, existencia: 9 },
        ],
      });
      const porCarga = await historial(`idCarga=${idCarga}`);
      expect(lista(porCarga)).toHaveLength(2);
      expect(lista(porCarga).every((a) => a.origen === 'carga_masiva' && a.motivo === 'carga_masiva')).toBe(true);
      const manuales = await historial(`origen=manual&idVariante=${v.v1}`);
      expect(lista(manuales)).toHaveLength(1);
      const pagina = await historial(`idCarga=${idCarga}&limite=1&pagina=2`);
      expect(lista(pagina)).toHaveLength(1);
      expect(pagina.cuerpo.pagination).toMatchObject({ pagina: 2, limite: 1, total: 2, totalPaginas: 2 });
    });

    it.each([
      ['idCarga que no es uuid', 'idCarga=abc'],
      ['origen desconocido', 'origen=sap'],
      ['idVariante no numérico', 'idVariante=x'],
    ])('rechaza %s con 400', async (_n, consulta) => {
      expect((await historial(consulta)).status).toBe(400);
    });

    it('si el usuario ya no existe, el historial se conserva y muestra "Usuario eliminado" (D5)', async () => {
      const efimero = await prisma.usuario.create({
        data: { nombre: 'Efímero', correo: `efimero-${ALEATORIO}@m13.test`, contrasena: 'x' },
      });
      await prisma.ajusteInventario.create({
        data: { idVariante: v.v1, existenciaAnterior: 10, existenciaNueva: 11, idUsuario: efimero.idUsuario },
      });
      expect(lista(await historial(`idVariante=${v.v1}`))[0]).toMatchObject({ usuario: 'Efímero' });
      await prisma.usuario.delete({ where: { idUsuario: efimero.idUsuario } });
      expect(lista(await historial(`idVariante=${v.v1}`))[0]).toMatchObject({
        idUsuario: null,
        usuario: 'Usuario eliminado',
        existenciaNueva: 11,
      });
    });

    it('el historial es inmutable: no hay rutas para editarlo ni borrarlo, y la variante con historial no se borra', async () => {
      await editor('PUT', `/variantes/${v.v1}/existencia`, { existencia: 11 });
      for (const metodo of ['PUT', 'PATCH', 'POST', 'DELETE'] as const) {
        expect(await servidor.estado(metodo, '/historial', 'admin')).toBe(404);
        expect(await servidor.estado(metodo, `/historial/${v.v1}`, 'admin')).toBe(404);
      }
      await expect(prisma.variante.delete({ where: { idVariante: v.v1 } })).rejects.toThrow();
    });
  });

  describe('plantilla (R6, D4)', () => {
    it('es un CSV con BOM y ; con todas las variantes activas y su existencia actual', async () => {
      const r = await servidor.texto('admin', `/plantilla?idMarca=${marcaId.a}`);
      expect(r.status).toBe(200);
      expect(r.cabeceras.get('content-type')).toContain('text/csv');
      expect(r.cabeceras.get('content-disposition')).toContain('attachment');
      expect(r.texto.startsWith('﻿')).toBe(true);
      expect(r.texto.slice(1).split('\r\n')).toEqual([
        'marca;producto;medida;sku;existencia_actual;existencia',
        `${nombres.marcaA};'${nombres.pA2};${nombres.galon};'${sku.v3};5;5`,
        `${nombres.marcaA};${nombres.pA1};${nombres.cuarto};${sku.v2};0;0`,
        `${nombres.marcaA};${nombres.pA1};${nombres.galon};${sku.v1};10;10`,
        '',
      ]);
    });

    it('las inactivas solo salen con incluirInactivas', async () => {
      const sin = await servidor.texto('admin', `/plantilla?idMarca=${marcaId.b}`);
      expect(sin.texto).not.toContain(sku.v4);
      const con = await servidor.texto('admin', `/plantilla?idMarca=${marcaId.b}&incluirInactivas=true`);
      expect(con.texto).toContain(`${sku.v4};3;3`);
    });

    it('rechaza una marca inválida con 400', async () => {
      expect((await servidor.texto('admin', '/plantilla?idMarca=x')).status).toBe(400);
    });

    it('la plantilla descargada se puede volver a cargar tal cual: todas las filas quedan "sin cambios"', async () => {
      const r = await servidor.texto('admin', `/plantilla?idMarca=${marcaId.a}`);
      const filas = r.texto
        .slice(1)
        .split('\r\n')
        .slice(1)
        .filter((l) => l !== '')
        .map((linea) => {
          const [marca, producto, medida, codigo, , existencia] = linea.split(';');
          return { marca, producto, medida, sku: codigo, existencia: Number(existencia) };
        });
      const previa = await editor('POST', '/cargas/previsualizar', { filas });
      expect(dato(previa).balance).toEqual({ total: 3, modificadas: 0, sinCambios: 3, rechazadas: 0 });
    });
  });

  describe('carga masiva (R5–R10)', () => {
    const previsualizar = (filas: unknown[]) => editor('POST', '/cargas/previsualizar', { filas });
    const aplicar = (filas: unknown[], idCarga = randomUUID()) => editor('POST', '/cargas/aplicar', { idCarga, filas });
    const filasDe = (r: { cuerpo: { data?: unknown } }): Dato[] => dato(r).filas as Dato[];

    it('la vista previa evalúa cada fila y NO escribe (R8)', async () => {
      const r = await previsualizar([
        { sku: sku.v1, existencia: 20 },
        { sku: sku.v5, existencia: 8 },
        { sku: 'NO-EXISTE', existencia: 1 },
      ]);
      expect(r.status).toBe(200);
      expect(dato(r)).toMatchObject({
        aplicada: false,
        idCarga: null,
        balance: { total: 3, modificadas: 1, sinCambios: 1, rechazadas: 1 },
      });
      expect(filasDe(r)[0]).toEqual({
        indice: 0,
        resultado: 'modificada',
        idVariante: v.v1,
        variante: `${nombres.pA1} · ${nombres.galon}`,
        existenciaAnterior: 10,
        existenciaNueva: 20,
        motivoRechazo: null,
      });
      expect(filasDe(r)[1]).toMatchObject({ resultado: 'sin_cambios', existenciaAnterior: 8, existenciaNueva: 8 });
      expect(filasDe(r)[2]).toMatchObject({
        resultado: 'rechazada',
        idVariante: null,
        variante: null,
        motivoRechazo: 'variante_no_encontrada',
      });
      expect(await existenciaEnBd(v.v1)).toBe(10);
      expect(await prisma.ajusteInventario.count({ where: { idVariante: { in: idsVariantes() } } })).toBe(0);
    });

    it('aplicar escribe las filas buenas con su historial y el idCarga, aunque otras se rechacen (R7)', async () => {
      const idCarga = randomUUID();
      const r = await aplicar(
        [
          { sku: sku.v1, existencia: 20, nota: 'Conteo de bodega' },
          { sku: 'NO-EXISTE', existencia: 1 },
          { sku: sku.v2, existencia: 6 },
        ],
        idCarga,
      );
      expect(r.status).toBe(200);
      expect(dato(r)).toMatchObject({
        aplicada: true,
        idCarga,
        balance: { total: 3, modificadas: 2, sinCambios: 0, rechazadas: 1 },
      });
      expect(await existenciaEnBd(v.v1)).toBe(20);
      expect(await existenciaEnBd(v.v2)).toBe(6);
      const historial = await prisma.ajusteInventario.findMany({ where: { idCarga }, orderBy: { idVariante: 'asc' } });
      expect(historial.map((a) => [a.idVariante, a.existenciaAnterior, a.existenciaNueva])).toEqual([
        [v.v1, 10, 20],
        [v.v2, 0, 6],
      ]);
      expect(historial.every((a) => a.origen === 'carga_masiva' && a.motivo === 'carga_masiva')).toBe(true);
      expect(historial.every((a) => a.idUsuario === ids.editor)).toBe(true);
      expect(historial.find((a) => a.idVariante === v.v1)?.nota).toBe('Conteo de bodega');
    });

    it('identifica por marca + producto + medida sin importar mayúsculas, tildes ni espacios (R5)', async () => {
      const r = await aplicar([
        {
          marca: `  MARCA   NANDU ${ALEATORIO.toUpperCase()}`,
          producto: 'vinilo  mate',
          medida: ` GALON ${ALEATORIO}`,
          existencia: 31,
        },
      ]);
      expect(filasDe(r)[0]).toMatchObject({ resultado: 'modificada', idVariante: v.v1, existenciaNueva: 31 });
      expect(await existenciaEnBd(v.v1)).toBe(31);
    });

    it('si vienen SKU y nombres, manda el SKU (R5)', async () => {
      const r = await previsualizar([
        { sku: sku.v2, marca: nombres.marcaA, producto: nombres.pA1, medida: nombres.galon, existencia: 3 },
      ]);
      expect(filasDe(r)[0]).toMatchObject({ idVariante: v.v2 });
      const mala = await previsualizar([
        { sku: 'NO-EXISTE', marca: nombres.marcaA, producto: nombres.pA1, medida: nombres.galon, existencia: 3 },
      ]);
      expect(filasDe(mala)[0]).toMatchObject({ resultado: 'rechazada', motivoRechazo: 'variante_no_encontrada' });
    });

    it('reconoce un SKU que la plantilla neutralizó con apóstrofo (D4)', async () => {
      const r = await previsualizar([{ sku: `'${sku.v3}`, existencia: 50 }]);
      expect(filasDe(r)[0]).toMatchObject({ idVariante: v.v3, resultado: 'modificada' });
    });

    it('rechaza una fila sin identificador completo y una con la existencia inválida', async () => {
      const r = await previsualizar([
        { existencia: 1 },
        { marca: nombres.marcaA, producto: nombres.pA1, existencia: 1 },
        { sku: sku.v1, existencia: -3 },
        { sku: sku.v1.toLowerCase().replace('v1', 'v2'), existencia: 2.5 },
        { sku: sku.v5, existencia: 2_147_483_648 },
      ]);
      expect(filasDe(r).map((f) => f.motivoRechazo)).toEqual([
        'identificador_ausente',
        'identificador_ausente',
        'existencia_invalida',
        'existencia_invalida',
        'existencia_invalida',
      ]);
      expect(filasDe(r)[2]).toMatchObject({ idVariante: v.v1, existenciaAnterior: 10, existenciaNueva: null });
      expect(dato(r).balance).toMatchObject({ rechazadas: 5, modificadas: 0 });
    });

    it('la misma variante dos veces en un bloque se rechaza en todas sus filas, aunque se nombre distinto (R10)', async () => {
      const r = await aplicar([
        { sku: sku.v1, existencia: 40 },
        { marca: nombres.marcaA, producto: nombres.pA1, medida: nombres.galon, existencia: 41 },
        { sku: sku.v2, existencia: 5 },
      ]);
      expect(filasDe(r).map((f) => [f.resultado, f.motivoRechazo])).toEqual([
        ['rechazada', 'variante_repetida_en_bloque'],
        ['rechazada', 'variante_repetida_en_bloque'],
        ['modificada', null],
      ]);
      expect(await existenciaEnBd(v.v1)).toBe(10);
      expect(await existenciaEnBd(v.v2)).toBe(5);
    });

    it('aplicar dos veces el mismo bloque es idempotente: la segunda deja todo "sin cambios" y sin historial nuevo (R8)', async () => {
      const filas = [
        { sku: sku.v1, existencia: 22 },
        { sku: sku.v5, existencia: 1 },
      ];
      await aplicar(filas);
      const segunda = await aplicar(filas);
      expect(dato(segunda).balance).toEqual({ total: 2, modificadas: 0, sinCambios: 2, rechazadas: 0 });
      expect(await prisma.ajusteInventario.count({ where: { idVariante: { in: [v.v1, v.v5] } } })).toBe(2);
    });

    it('las variantes que no aparecen en la carga no se tocan (R9)', async () => {
      await aplicar([{ sku: sku.v1, existencia: 99 }]);
      expect(await existenciaEnBd(v.v2)).toBe(0);
      expect(await existenciaEnBd(v.v3)).toBe(5);
      expect(await existenciaEnBd(v.v5)).toBe(8);
      expect(await prisma.ajusteInventario.count({ where: { idVariante: { in: [v.v2, v.v3, v.v5] } } })).toBe(0);
    });

    it('también ajusta variantes inactivas (R11)', async () => {
      const r = await aplicar([{ sku: sku.v4, existencia: 30 }]);
      expect(filasDe(r)[0]).toMatchObject({ resultado: 'modificada', idVariante: v.v4 });
      expect(await existenciaEnBd(v.v4)).toBe(30);
    });

    it('el bloque se aplica completo o no se aplica: si falla una escritura, no queda nada a medias (R7)', async () => {
      const original = InventarioRepository.prototype.variantesBuscables;
      vi.spyOn(InventarioRepository.prototype, 'variantesBuscables').mockImplementationOnce(async function (
        this: unknown,
      ) {
        const reales = await original.call(this);
        return [
          ...reales,
          { idVariante: 2147483000, sku: 'FANTASMA', marca: 'M', producto: 'P', medida: 'X', existenciaReferencial: 0 },
        ];
      });
      await expect(
        aplicar([
          { sku: sku.v1, existencia: 60 },
          { sku: sku.v2, existencia: 61 },
          { sku: 'FANTASMA', existencia: 5 },
        ]),
      ).rejects.toThrow(/500/);
      expect(await existenciaEnBd(v.v1)).toBe(10);
      expect(await existenciaEnBd(v.v2)).toBe(0);
      expect(await prisma.ajusteInventario.count({ where: { idVariante: { in: idsVariantes() } } })).toBe(0);
    });

    it('si la existencia cambió entre la lectura y la escritura, manda la que hay al bloquear la fila', async () => {
      const original = InventarioRepository.prototype.variantesBuscables;
      vi.spyOn(InventarioRepository.prototype, 'variantesBuscables').mockImplementationOnce(async function (
        this: unknown,
      ) {
        // La vista que tiene el servicio está desactualizada: ve 5 donde en realidad hay 10.
        return (await original.call(this)).map((x) => (x.idVariante === v.v1 ? { ...x, existenciaReferencial: 5 } : x));
      });
      const r = await aplicar([{ sku: sku.v1, existencia: 10 }]);
      expect(filasDe(r)[0]).toMatchObject({ resultado: 'sin_cambios', existenciaAnterior: 10, existenciaNueva: 10 });
      expect(dato(r).balance).toMatchObject({ modificadas: 0, sinCambios: 1 });
      expect(await prisma.ajusteInventario.count({ where: { idVariante: v.v1 } })).toBe(0);
    });

    it('acepta un bloque de 500 filas y rechaza 501 o ninguna con 400', async () => {
      const relleno = Array.from({ length: 500 }, (_u, i) => ({ sku: `NO-${i}`, existencia: 1 }));
      const ok = await previsualizar(relleno);
      expect(dato(ok).balance).toMatchObject({ total: 500, rechazadas: 500 });
      expect((await previsualizar([...relleno, { sku: 'x', existencia: 1 }])).status).toBe(400);
      expect((await previsualizar([])).status).toBe(400);
    });

    it.each([
      ['sin idCarga', { filas: [{ sku: 'a', existencia: 1 }] }],
      ['idCarga que no es uuid', { idCarga: 'lote-1', filas: [{ sku: 'a', existencia: 1 }] }],
      ['existencia como texto', { idCarga: randomUUID(), filas: [{ sku: 'a', existencia: '5' }] }],
      [
        'nota de más de 500 caracteres',
        { idCarga: randomUUID(), filas: [{ sku: 'a', existencia: 1, nota: 'x'.repeat(501) }] },
      ],
      ['sin filas', { idCarga: randomUUID() }],
    ])('aplicar rechaza %s con 400 PARAMETRO_INVALIDO', async (_n, cuerpo) => {
      const r = await editor('POST', '/cargas/aplicar', cuerpo);
      expect([r.status, r.cuerpo.error?.code]).toEqual([400, 'PARAMETRO_INVALIDO']);
    });
  });
});
