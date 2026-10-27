import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ServidorBusqueda } from './helpers/servidor-ofertas';

/**
 * M02 · B7 y B8: filtrar por un color (o por una familia) devuelve los productos que PUEDEN entregarlo, también los
 * entonables por su carta (misma marca, base y acabado), no solo los que lo traen de fábrica. Contra PostgreSQL real; se
 * activa con `M01_TEST_DATABASE_URL`.
 */
const URL_BD = process.env.M01_TEST_DATABASE_URL;
const ALEATORIO = Math.random().toString(36).slice(2, 8);
const PREFIJO = `ZZ-M02COL-${ALEATORIO}`;

interface Dato {
  [clave: string]: unknown;
}

describe.skipIf(URL_BD === undefined)('M02 · color por la carta de los entonables (HTTP + PostgreSQL)', () => {
  let servidor: ServidorBusqueda;
  let prisma: (typeof import('../../../core/db/client'))['prisma'];
  const f = {
    marca: 0, otraMarca: 0, b1: 0, b2: 0, bApagada: 0, a1: 0, a2: 0, azules: 0, rojos: 0,
    cAzul: 0, cRojo: 0, cFijo: 0, cOtroAcabado: 0, cOtraBase: 0, cOtraMarca: 0,
    pEntonable: 0, pOtroAcabado: 0, pFijo: 0, pOtraMarca: 0, pBaseApagada: 0,
  };
  const auditoria = { registrarAccesoDenegado: vi.fn() };
  const ids = async (consulta: string): Promise<number[]> => {
    const r = await servidor.publica(`/productos?${consulta}&limite=48`);
    return (r.cuerpo.data as Dato[]).map((p) => p.idProducto as number).sort((a, b) => a - b);
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_BD ?? '';
    ({ prisma } = await import('../../../core/db/client.js'));
    const { levantarServidorBusqueda } = await import('./helpers/servidor-ofertas.js');
    servidor = await levantarServidorBusqueda(auditoria);

    const marca = async (n: string): Promise<number> =>
      (await prisma.marca.create({ data: { nombre: `${PREFIJO}-${n}`, logotipo: Buffer.from('x'), logotipoMimeType: 'image/png' } })).idMarca;
    f.marca = await marca('m');
    f.otraMarca = await marca('otra');
    f.b1 = (await prisma.base.create({ data: { nombre: `${PREFIJO}-b1` } })).idBase;
    f.b2 = (await prisma.base.create({ data: { nombre: `${PREFIJO}-b2` } })).idBase;
    f.bApagada = (await prisma.base.create({ data: { nombre: `${PREFIJO}-bx`, estado: 'inactivo' } })).idBase;
    f.a1 = (await prisma.acabado.create({ data: { nombre: `${PREFIJO}-a1` } })).idAcabado;
    f.a2 = (await prisma.acabado.create({ data: { nombre: `${PREFIJO}-a2` } })).idAcabado;
    f.azules = (await prisma.familiaColor.findFirstOrThrow({ where: { nombre: 'Azules' } })).idFamiliaColor;
    f.rojos = (await prisma.familiaColor.findFirstOrThrow({ where: { nombre: 'Rojos' } })).idFamiliaColor;
    const color = async (n: string, extra: Dato): Promise<number> =>
      (await prisma.color.create({ data: { nombre: `${PREFIJO} ${n}`, hexadecimal: '#2F6E9E', idMarca: f.marca, idAcabado: f.a1, ...extra } as never })).idColor;
    f.cAzul = await color('Azul', { idBase: f.b1, idFamiliaColor: f.azules });
    f.cRojo = await color('Rojo', { idBase: f.b1, idFamiliaColor: f.rojos, hexadecimal: '#A3161E' });
    f.cFijo = await color('Fijo', { idBase: null, idFamiliaColor: f.rojos });
    f.cOtroAcabado = await color('Otro acabado', { idBase: f.b1, idAcabado: f.a2, idFamiliaColor: f.azules });
    f.cOtraBase = await color('Otra base', { idBase: f.b2, idFamiliaColor: f.azules });
    f.cOtraMarca = await color('Otra marca', { idBase: f.b1, idMarca: f.otraMarca, idFamiliaColor: f.azules });

    const categoria = await prisma.categoria.create({ data: { nombre: `${PREFIJO}-cat` } });
    const subcategoria = await prisma.subcategoria.create({ data: { idCategoria: categoria.idCategoria, nombre: `${PREFIJO}-sub` } });
    const tipo = await prisma.tipoMedida.create({ data: { nombre: `${PREFIJO}-tipo`, abreviatura: `W${ALEATORIO}` } });
    const medida = await prisma.medida.create({ data: { idTipoMedida: tipo.idTipoMedida, nombre: `${PREFIJO} galón`, valor: 1 } });
    const producto = async (n: string, idMarca: number): Promise<number> => {
      const p = await prisma.producto.create({ data: { idMarca, idSubcategoria: subcategoria.idSubcategoria, nombre: `${PREFIJO} ${n}`, publicado: true } });
      await prisma.variante.create({ data: { idProducto: p.idProducto, idMedida: medida.idMedida, sku: `${PREFIJO}-${n}`, precioVigente: 10000 } });
      return p.idProducto;
    };
    const entonable = async (idProducto: number, bases: number[], acabados: number[]): Promise<void> => {
      await prisma.productoBase.createMany({ data: bases.map((idBase) => ({ idProducto, idBase })) });
      await prisma.productoAcabado.createMany({ data: acabados.map((idAcabado) => ({ idProducto, idAcabado })) });
    };
    f.pEntonable = await producto('Entonable', f.marca);
    await entonable(f.pEntonable, [f.b1], [f.a1]);
    f.pOtroAcabado = await producto('OtroAcabado', f.marca);
    await entonable(f.pOtroAcabado, [f.b1], [f.a2]);
    f.pFijo = await producto('Fijo', f.marca);
    await prisma.productoColor.create({ data: { idProducto: f.pFijo, idColor: f.cFijo } });
    f.pOtraMarca = await producto('OtraMarca', f.otraMarca);
    await entonable(f.pOtraMarca, [f.b1], [f.a1]);
    f.pBaseApagada = await producto('BaseApagada', f.marca);
    await entonable(f.pBaseApagada, [f.bApagada], [f.a1]);
  });

  afterAll(async () => {
    const productos = await prisma.producto.findMany({ where: { nombre: { startsWith: PREFIJO } }, select: { idProducto: true } });
    const idsP = productos.map((p) => p.idProducto);
    await prisma.variante.deleteMany({ where: { idProducto: { in: idsP } } });
    await prisma.producto.deleteMany({ where: { idProducto: { in: idsP } } });
    await prisma.color.deleteMany({ where: { nombre: { startsWith: PREFIJO } } });
    await prisma.medida.deleteMany({ where: { nombre: { startsWith: PREFIJO } } });
    await prisma.tipoMedida.deleteMany({ where: { nombre: `${PREFIJO}-tipo` } });
    await prisma.subcategoria.deleteMany({ where: { nombre: `${PREFIJO}-sub` } });
    await prisma.categoria.deleteMany({ where: { nombre: `${PREFIJO}-cat` } });
    await prisma.base.deleteMany({ where: { nombre: { startsWith: PREFIJO } } });
    await prisma.acabado.deleteMany({ where: { nombre: { startsWith: PREFIJO } } });
    await prisma.marca.deleteMany({ where: { nombre: { startsWith: PREFIJO } } });
    await servidor.cerrar();
    await prisma.$disconnect();
  });

  it('un color de la carta devuelve los entonables de su marca cuya base y acabado coinciden (B7)', async () => {
    expect(await ids(`idColor=${f.cAzul}`)).toEqual([f.pEntonable]);
    expect(await ids(`idColor=${f.cRojo}`)).toEqual([f.pEntonable]);
  });

  it('no devuelve productos de otro acabado, de otra marca ni con la base apagada', async () => {
    const r = await ids(`idColor=${f.cAzul}`);
    for (const otro of [f.pOtroAcabado, f.pOtraMarca, f.pBaseApagada]) expect(r).not.toContain(otro);
    expect(await ids(`idColor=${f.cOtraBase}`)).toEqual([]);
    expect(await ids(`idColor=${f.cOtroAcabado}`)).toEqual([f.pOtroAcabado]);
    expect(await ids(`idColor=${f.cOtraMarca}`)).toEqual([f.pOtraMarca]);
  });

  it('un color de fábrica sigue devolviendo solo los productos que lo traen', async () => {
    expect(await ids(`idColor=${f.cFijo}`)).toEqual([f.pFijo]);
  });

  it('varios colores se combinan con O', async () => {
    expect(await ids(`idColor=${f.cAzul},${f.cFijo}`)).toEqual([f.pEntonable, f.pFijo].sort((a, b) => a - b));
  });

  it('la familia cromática incluye los colores de la carta de los entonables (B8)', async () => {
    const azules = await ids(`idFamiliaColor=${f.azules}&idMarca=${f.marca}`);
    expect(azules).toEqual([f.pEntonable, f.pOtroAcabado].sort((a, b) => a - b));
    const rojos = await ids(`idFamiliaColor=${f.rojos}&idMarca=${f.marca}`);
    expect(rojos).toEqual([f.pEntonable, f.pFijo].sort((a, b) => a - b));
  });

  it('las opciones de familia también cuentan los colores de la carta', async () => {
    const r = await servidor.publica(`/filtros?idMarca=${f.marca}`);
    const familias = (r.cuerpo.data as { familiasColor: Array<{ id: number; total: number }> }).familiasColor;
    expect(familias.find((x) => x.id === f.azules)?.total).toBe(2);
    expect(familias.find((x) => x.id === f.rojos)?.total).toBe(2);
  });
});
