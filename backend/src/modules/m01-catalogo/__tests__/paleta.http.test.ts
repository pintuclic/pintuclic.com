import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AutorizacionService } from '../../m20-seguridad/services/autorizacion.service';
import type { PaletaService } from '../services/paleta.service';

/**
 * M01 · paleta de color (contrato entrega 4) contra PostgreSQL real, por HTTP. Se activa con `M01_TEST_DATABASE_URL`;
 * sin ella se omite. Los colores y productos de la prueba llevan un prefijo propio y se buscan por él (`q`), para no
 * depender de lo que haya en la base compartida.
 */
const URL_BD = process.env.M01_TEST_DATABASE_URL;
const ALEATORIO = Math.random().toString(36).slice(2, 8);
const PREFIJO = `ZZ-PAL-${ALEATORIO}`;

interface Dato {
  [clave: string]: unknown;
}

describe.skipIf(URL_BD === undefined)('M01 · paleta de color (HTTP + PostgreSQL)', () => {
  let servidor: Server;
  let base: string;
  let paleta: PaletaService;
  let prisma: (typeof import('../../../core/db/client'))['prisma'];
  const f = {
    marca: 0, otraMarca: 0, marcaApagada: 0, base1: 0, base2: 0, baseApagada: 0, acabado1: 0, acabado2: 0,
    azules: 0, rojos: 0,
    cAzul: 0, cRojo: 0, cSinProducto: 0, cFijo: 0, cApagado: 0, cOtroAcabado: 0, cOtraMarca: 0, cBaseApagada: 0,
    p1: 0, p2: 0, pFijo: 0, pSinPublicar: 0, pSinVariante: 0, pOtraMarca: 0, pBaseApagada: 0,
  };

  const pedir = async (ruta: string): Promise<{ status: number; cuerpo: { success: boolean; data?: unknown; pagination?: Dato; error?: { code: string } } }> => {
    const r = await fetch(`${base}/api/v1/catalogo${ruta}`);
    return { status: r.status, cuerpo: (await r.json()) as never };
  };
  const lista = (r: { cuerpo: { data?: unknown } }): Dato[] => (r.cuerpo.data as { colores: Dato[] }).colores;
  const apoyo = (r: { cuerpo: { data?: unknown } }) => r.cuerpo.data as { familias: Dato[]; marcas: Dato[] };
  const buscar = async (extra = ''): Promise<Dato[]> => lista(await pedir(`/paleta/colores?q=${PREFIJO}&limite=48${extra}`));
  const porNombre = (items: Dato[], sufijo: string): Dato | undefined => items.find((c) => c.nombre === `${PREFIJO} ${sufijo}`);

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_BD ?? '';
    ({ prisma } = await import('../../../core/db/client.js'));
    // El cliente de Prisma se crea al importar: se importa después de fijar la URL de la base de pruebas.
    const { construirModuloM01 } = await import('../m01.routes.js');
    const { errorHandler } = await import('../../../core/middlewares/errorHandler.js');
    const m01 = construirModuloM01({} as AutorizacionService);
    paleta = m01.paletaService;
    const app = express();
    app.use('/api/v1/catalogo', m01.publicRouter);
    app.use(errorHandler);
    servidor = await new Promise((resolver) => {
      const s = app.listen(0, () => resolver(s));
    });
    base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;

    const marca = async (n: string, estado: 'activo' | 'inactivo' = 'activo'): Promise<number> =>
      (await prisma.marca.create({ data: { nombre: `${PREFIJO}-${n}`, logotipo: Buffer.from('x'), logotipoMimeType: 'image/png', estado } })).idMarca;
    f.marca = await marca('m');
    f.otraMarca = await marca('otra');
    f.marcaApagada = await marca('apagada', 'inactivo');
    f.base1 = (await prisma.base.create({ data: { nombre: `${PREFIJO}-b1` } })).idBase;
    f.base2 = (await prisma.base.create({ data: { nombre: `${PREFIJO}-b2` } })).idBase;
    f.baseApagada = (await prisma.base.create({ data: { nombre: `${PREFIJO}-bx`, estado: 'inactivo' } })).idBase;
    f.acabado1 = (await prisma.acabado.create({ data: { nombre: `${PREFIJO}-a1` } })).idAcabado;
    f.acabado2 = (await prisma.acabado.create({ data: { nombre: `${PREFIJO}-a2` } })).idAcabado;
    f.azules = (await prisma.familiaColor.findFirstOrThrow({ where: { nombre: 'Azules' } })).idFamiliaColor;
    f.rojos = (await prisma.familiaColor.findFirstOrThrow({ where: { nombre: 'Rojos' } })).idFamiliaColor;

    const color = async (sufijo: string, hexadecimal: string, extra: Dato): Promise<number> =>
      (
        await prisma.color.create({
          data: { nombre: `${PREFIJO} ${sufijo}`, codigo: `${PREFIJO}-${sufijo}`.slice(0, 60), hexadecimal, idMarca: f.marca, idAcabado: f.acabado1, ...extra } as never,
        })
      ).idColor;
    f.cAzul = await color('Azul', '#2F6E9E', { idBase: f.base1, idFamiliaColor: f.azules });
    f.cRojo = await color('Rojo', '#A3161E', { idBase: f.base1, idFamiliaColor: f.rojos });
    f.cSinProducto = await color('Sin producto', '#00AA00', { idBase: f.base2 });
    f.cFijo = await color('Fijo', '#F7C600', { idBase: null });
    f.cApagado = await color('Apagado', '#112233', { idBase: f.base1, estado: 'inactivo' });
    f.cOtroAcabado = await color('Otro acabado', '#334455', { idBase: f.base1, idAcabado: f.acabado2 });
    f.cOtraMarca = await color('Otra marca', '#2F6E9F', { idBase: f.base1, idMarca: f.otraMarca, idFamiliaColor: f.azules });
    f.cBaseApagada = await color('Base apagada', '#556677', { idBase: f.baseApagada });

    const categoria = await prisma.categoria.create({ data: { nombre: `${PREFIJO}-cat` } });
    const subcategoria = await prisma.subcategoria.create({ data: { idCategoria: categoria.idCategoria, nombre: `${PREFIJO}-sub` } });
    const medida = await (async () => {
      const tipo = await prisma.tipoMedida.create({ data: { nombre: `${PREFIJO}-tipo`, abreviatura: `P${ALEATORIO}` } });
      return prisma.medida.create({ data: { idTipoMedida: tipo.idTipoMedida, nombre: `${PREFIJO} galón`, valor: 1 } });
    })();
    const producto = async (sufijo: string, idMarca: number, extra: Dato, conVariante = true): Promise<number> => {
      const p = await prisma.producto.create({
        data: { idMarca, idSubcategoria: subcategoria.idSubcategoria, nombre: `${PREFIJO} ${sufijo}`, publicado: true, ...extra } as never,
      });
      if (conVariante) {
        await prisma.variante.create({ data: { idProducto: p.idProducto, idMedida: medida.idMedida, sku: `${PREFIJO}-${sufijo}`.slice(0, 60), precioVigente: 10000 } });
      }
      return p.idProducto;
    };
    const entonable = async (idProducto: number, bases: number[], acabados: number[]): Promise<void> => {
      await prisma.productoBase.createMany({ data: bases.map((idBase) => ({ idProducto, idBase })) });
      await prisma.productoAcabado.createMany({ data: acabados.map((idAcabado) => ({ idProducto, idAcabado })) });
    };
    f.p1 = await producto('P1', f.marca, {});
    await entonable(f.p1, [f.base1], [f.acabado1]);
    f.p2 = await producto('P2', f.marca, {});
    await entonable(f.p2, [f.base1], [f.acabado1]);
    f.pFijo = await producto('Fijo', f.marca, {});
    await prisma.productoColor.create({ data: { idProducto: f.pFijo, idColor: f.cFijo } });
    f.pSinPublicar = await producto('SinPublicar', f.marca, { publicado: false });
    await entonable(f.pSinPublicar, [f.base2], [f.acabado1]);
    f.pSinVariante = await producto('SinVariante', f.marca, {}, false);
    await entonable(f.pSinVariante, [f.base2], [f.acabado1]);
    f.pOtraMarca = await producto('OtraMarca', f.otraMarca, {});
    await entonable(f.pOtraMarca, [f.base1], [f.acabado1]);
    f.pBaseApagada = await producto('BaseApagada', f.marca, {});
    await entonable(f.pBaseApagada, [f.baseApagada], [f.acabado1]);
    paleta.invalidar();
  });

  afterAll(async () => {
    const productos = await prisma.producto.findMany({ where: { nombre: { startsWith: PREFIJO } }, select: { idProducto: true } });
    const ids = productos.map((p) => p.idProducto);
    await prisma.variante.deleteMany({ where: { idProducto: { in: ids } } });
    await prisma.producto.deleteMany({ where: { idProducto: { in: ids } } });
    await prisma.color.deleteMany({ where: { nombre: { startsWith: PREFIJO } } });
    await prisma.medida.deleteMany({ where: { nombre: { startsWith: PREFIJO } } });
    await prisma.tipoMedida.deleteMany({ where: { nombre: `${PREFIJO}-tipo` } });
    await prisma.subcategoria.deleteMany({ where: { nombre: `${PREFIJO}-sub` } });
    await prisma.categoria.deleteMany({ where: { nombre: `${PREFIJO}-cat` } });
    await prisma.base.deleteMany({ where: { nombre: { startsWith: PREFIJO } } });
    await prisma.acabado.deleteMany({ where: { nombre: { startsWith: PREFIJO } } });
    await prisma.marca.deleteMany({ where: { nombre: { startsWith: PREFIJO } } });
    await new Promise<void>((r, e) => servidor.close((x) => (x ? e(x) : r())));
    await prisma.$disconnect();
  });

  describe('qué colores se muestran (P1)', () => {
    it('solo los que algún producto visible puede entregar hoy', async () => {
      const items = await buscar();
      const nombres = items.map((c) => String(c.nombre).replace(`${PREFIJO} `, '')).sort();
      // Azul y Rojo (carta de P1 y P2), Fijo (de fábrica de un producto de colores fijos) y el de la otra marca (su producto).
      expect(nombres).toEqual(['Azul', 'Fijo', 'Otra marca', 'Rojo']);
    });

    it('no salen: sin producto que lo entregue, apagado, con otro acabado ni con la base apagada', async () => {
      const nombres = (await buscar()).map((c) => c.nombre);
      for (const sufijo of ['Sin producto', 'Apagado', 'Otro acabado', 'Base apagada']) {
        expect(nombres, sufijo).not.toContain(`${PREFIJO} ${sufijo}`);
      }
    });

    it('cuenta los productos visibles que lo entregan; un producto sin publicar o sin variantes activas no cuenta', async () => {
      const items = await buscar();
      expect(porNombre(items, 'Azul')?.totalProductos).toBe(2);
      expect(porNombre(items, 'Rojo')?.totalProductos).toBe(2);
      expect(porNombre(items, 'Fijo')?.totalProductos).toBe(1);
      expect(porNombre(items, 'Otra marca')?.totalProductos).toBe(1);
    });

    it('trae marca, familia, acabado y el hexadecimal', async () => {
      expect(porNombre(await buscar(), 'Azul')).toMatchObject({
        idColor: f.cAzul, hexadecimal: '#2F6E9E', marca: `${PREFIJO}-m`, familia: 'Azules', acabado: `${PREFIJO}-a1`,
        codigo: `${PREFIJO}-Azul`,
      });
    });

    it('un cambio se refleja al reconstruir: despublicar un producto baja la cuenta', async () => {
      await prisma.producto.update({ where: { idProducto: f.p2 }, data: { publicado: false } });
      paleta.invalidar();
      expect(porNombre(await buscar(), 'Azul')?.totalProductos).toBe(1);
      await prisma.producto.update({ where: { idProducto: f.p2 }, data: { publicado: true } });
      await prisma.producto.update({ where: { idProducto: f.p1 }, data: { publicado: false } });
      await prisma.producto.update({ where: { idProducto: f.p2 }, data: { publicado: false } });
      paleta.invalidar();
      // Sin productos visibles, el color deja de aparecer.
      expect(porNombre(await buscar(), 'Azul')).toBeUndefined();
      await prisma.producto.updateMany({ where: { idProducto: { in: [f.p1, f.p2] } }, data: { publicado: true } });
      paleta.invalidar();
      expect(porNombre(await buscar(), 'Azul')?.totalProductos).toBe(2);
    });

    it('desactivar un acabado, una base o la marca saca los colores que dependían de ello', async () => {
      await prisma.acabado.update({ where: { idAcabado: f.acabado1 }, data: { estado: 'inactivo' } });
      paleta.invalidar();
      expect(porNombre(await buscar(), 'Azul')).toBeUndefined();
      await prisma.acabado.update({ where: { idAcabado: f.acabado1 }, data: { estado: 'activo' } });
      await prisma.marca.update({ where: { idMarca: f.otraMarca }, data: { estado: 'inactivo' } });
      paleta.invalidar();
      expect(porNombre(await buscar(), 'Otra marca')).toBeUndefined();
      await prisma.marca.update({ where: { idMarca: f.otraMarca }, data: { estado: 'activo' } });
      paleta.invalidar();
      expect(porNombre(await buscar(), 'Otra marca')).toBeDefined();
    });
  });

  describe('listado, filtros y listas de apoyo (P2, P3, P4)', () => {
    it('filtra por familia y por marca, y busca por nombre o código sin tildes', async () => {
      expect((await buscar(`&familia=${f.azules}`)).map((c) => c.idColor).sort()).toEqual([f.cAzul, f.cOtraMarca].sort());
      expect((await buscar(`&idMarca=${f.otraMarca}`)).map((c) => c.idColor)).toEqual([f.cOtraMarca]);
      const r = await pedir(`/paleta/colores?q=${encodeURIComponent(`${PREFIJO}-ROJO`)}`);
      expect(lista(r).map((c) => c.idColor)).toEqual([f.cRojo]);
    });

    it('las familias y marcas de apoyo salen de lo ofrecido y se cuentan sin su propio filtro', async () => {
      const r = await pedir(`/paleta/colores?q=${PREFIJO}&familia=${f.rojos}`);
      const { familias, marcas } = apoyo(r);
      expect(familias.find((x) => x.nombre === 'Azules')?.total).toBe(2);
      expect(familias.find((x) => x.nombre === 'Rojos')?.total).toBe(1);
      expect(marcas.map((m) => [m.nombre, m.total])).toEqual([[`${PREFIJO}-m`, 1]]);
      expect(marcas.map((m) => m.idMarca)).not.toContain(f.marcaApagada);
    });

    it('pagina con el envelope de la API', async () => {
      const r = await pedir(`/paleta/colores?q=${PREFIJO}&limite=3&pagina=2`);
      expect(r.cuerpo.pagination).toEqual({ pagina: 2, limite: 3, total: 4, totalPaginas: 2 });
      expect(lista(r)).toHaveLength(1);
    });

    it('rechaza parámetros inválidos con 400 y acepta el límite máximo', async () => {
      expect((await pedir('/paleta/colores?limite=49')).status).toBe(400);
      expect((await pedir('/paleta/colores?familia=abc')).status).toBe(400);
      expect((await pedir('/paleta/colores?pagina=0')).status).toBe(400);
      expect((await pedir('/paleta/colores?limite=48')).status).toBe(200);
    });

    it('un filtro sin resultados da 200 y lista vacía', async () => {
      const r = await pedir(`/paleta/colores?q=${PREFIJO}-no-existe`);
      expect([r.status, lista(r)]).toEqual([200, []]);
    });
  });

  describe('armonías (P7, P8)', () => {
    it('trae las cuatro armonías y enlaza solo con colores de la misma marca, nunca con el elegido', async () => {
      const r = await pedir(`/paleta/colores/${f.cAzul}/armonias`);
      expect(r.status).toBe(200);
      const data = r.cuerpo.data as { color: Dato; sinTono: boolean; armonias: Array<{ tipo: string; muestras: Array<{ hexadecimal: string; cercano: Dato | null }> }> };
      expect(data.color).toMatchObject({ idColor: f.cAzul, nombre: `${PREFIJO} Azul` });
      expect(data.armonias.map((a) => a.tipo)).toEqual(['complementario', 'analogos', 'triadico', 'monocromatico']);
      const cercanos = data.armonias.flatMap((a) => a.muestras.map((m) => m.cercano)).filter((c): c is Dato => c !== null);
      for (const c of cercanos) {
        expect(c.idColor).not.toBe(f.cAzul);
        expect(c.idColor).not.toBe(f.cOtraMarca);
        expect(c.idMarca).toBe(f.marca);
        expect(c.deltaE as number).toBeLessThanOrEqual(25);
      }
      for (const m of data.armonias.flatMap((a) => a.muestras)) expect(m.hexadecimal).toMatch(/^#[0-9A-F]{6}$/);
    });

    it('404 para un color que no se ofrece (sin producto, apagado, inexistente) y 400 si el id no es válido', async () => {
      for (const id of [f.cSinProducto, f.cApagado, f.cOtroAcabado, f.cBaseApagada, 2_000_000_000]) {
        const r = await pedir(`/paleta/colores/${id}/armonias`);
        expect([r.status, r.cuerpo.error?.code], String(id)).toEqual([404, 'RECURSO_NO_DISPONIBLE']);
      }
      expect((await pedir('/paleta/colores/abc/armonias')).status).toBe(400);
    });
  });

  describe('el color puesto en la ficha (P11)', () => {
    const colores = async (idProducto: number, query: string) => {
      const r = await pedir(`/productos/${idProducto}/colores${query}`);
      return { status: r.status, items: (r.cuerpo.data as Dato[]).map((c) => c.idColor) };
    };

    it('sin `idColor` devuelve todos, como antes', async () => {
      const r = await colores(f.p1, `?busqueda=${PREFIJO}`);
      expect(r.items).toEqual(expect.arrayContaining([f.cAzul, f.cRojo]));
    });

    it('con `idColor` devuelve solo ese si el producto lo ofrece', async () => {
      expect(await colores(f.p1, `?idColor=${f.cAzul}`)).toEqual({ status: 200, items: [f.cAzul] });
    });

    it('si el producto no lo ofrece, lista vacía sin error', async () => {
      expect(await colores(f.p1, `?idColor=${f.cFijo}`)).toEqual({ status: 200, items: [] });
      expect(await colores(f.p1, `?idColor=${f.cSinProducto}`)).toEqual({ status: 200, items: [] });
      expect(await colores(f.pFijo, `?idColor=${f.cFijo}`)).toEqual({ status: 200, items: [f.cFijo] });
    });

    it('un `idColor` inválido responde 400', async () => {
      expect((await pedir(`/productos/${f.p1}/colores?idColor=abc`)).status).toBe(400);
    });
  });
});
