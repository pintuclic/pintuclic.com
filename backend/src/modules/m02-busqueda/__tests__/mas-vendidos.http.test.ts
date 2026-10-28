import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ServidorBusqueda } from './helpers/servidor-ofertas';

/**
 * M02 · O8 y F10: «más vendidos» ordena por las unidades de las órdenes de M08 de los últimos 90 días (sin canceladas ni
 * devueltas) y `conVentas=true` deja solo los que se vendieron. Contra PostgreSQL real; se activa con
 * `M01_TEST_DATABASE_URL`. Los productos llevan un prefijo propio y se buscan por él (`q`) para no depender de la base.
 */
const URL_BD = process.env.M01_TEST_DATABASE_URL;
const ALEATORIO = Math.random().toString(36).slice(2, 8);
const PREFIJO = `ZZ-VEND-${ALEATORIO}`;

interface Dato {
  [clave: string]: unknown;
}

describe.skipIf(URL_BD === undefined)('M02 · más vendidos (HTTP + PostgreSQL)', () => {
  let servidor: ServidorBusqueda;
  let prisma: (typeof import('../../../core/db/client'))['prisma'];
  const p = { a: 0, b: 0, c: 0, d: 0, e: 0 };
  const auditoria = { registrarAccesoDenegado: vi.fn() };
  const nombres = async (consulta: string): Promise<string[]> => {
    const r = await servidor.publica(`/productos?q=${PREFIJO}&limite=48&${consulta}`);
    return (r.cuerpo.data as Dato[]).map((x) => String(x.nombre).replace(`${PREFIJO} `, ''));
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_BD ?? '';
    ({ prisma } = await import('../../../core/db/client.js'));
    const { levantarServidorBusqueda } = await import('./helpers/servidor-ofertas.js');
    servidor = await levantarServidorBusqueda(auditoria);

    const marca = await prisma.marca.create({ data: { nombre: `${PREFIJO}-m`, logotipo: Buffer.from('x'), logotipoMimeType: 'image/png' } });
    const categoria = await prisma.categoria.create({ data: { nombre: `${PREFIJO}-cat` } });
    const subcategoria = await prisma.subcategoria.create({ data: { idCategoria: categoria.idCategoria, nombre: `${PREFIJO}-sub` } });
    const tipo = await prisma.tipoMedida.create({ data: { nombre: `${PREFIJO}-tipo`, abreviatura: `V${ALEATORIO}` } });
    const medida = await prisma.medida.create({ data: { idTipoMedida: tipo.idTipoMedida, nombre: `${PREFIJO} galón`, valor: 1 } });
    const variantes = new Map<string, number>();
    const producto = async (n: string): Promise<number> => {
      const x = await prisma.producto.create({ data: { idMarca: marca.idMarca, idSubcategoria: subcategoria.idSubcategoria, nombre: `${PREFIJO} ${n}`, publicado: true } });
      const v = await prisma.variante.create({ data: { idProducto: x.idProducto, idMedida: medida.idMedida, sku: `${PREFIJO}-${n}`, precioVigente: 10000 } });
      variantes.set(n, v.idVariante);
      return x.idProducto;
    };
    p.a = await producto('A');
    p.b = await producto('B');
    p.c = await producto('C');
    p.d = await producto('D');
    p.e = await producto('E');

    const usuario = await prisma.usuario.findFirstOrThrow();
    const hace = (dias: number): Date => new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
    const orden = async (cod: string, estado: 'entregado' | 'cancelado' | 'devuelto' | 'orden_confirmada', fecha: Date, lineas: Array<[string, number]>): Promise<void> => {
      await prisma.orden.create({
        data: {
          codigoVisible: `${PREFIJO}-${cod}`,
          idUsuario: usuario.idUsuario,
          estado,
          fecha,
          lineas: {
            create: lineas.map(([n, cantidad]) => ({
              nombreProducto: `${PREFIJO} ${n}`,
              varianteCopia: 'Galón',
              precioAplicado: 10000,
              cantidad,
              idVarianteRef: variantes.get(n) ?? null,
            })),
          },
        },
      });
    };
    await orden('1', 'entregado', hace(2), [['A', 2], ['B', 5]]);
    await orden('2', 'orden_confirmada', hace(10), [['A', 4]]);
    await orden('3', 'cancelado', hace(1), [['C', 100]]);
    await orden('4', 'devuelto', hace(3), [['C', 100]]);
    await orden('5', 'entregado', hace(120), [['D', 50]]);
  });

  afterAll(async () => {
    await prisma.lineaOrden.deleteMany({ where: { nombreProducto: { startsWith: PREFIJO } } });
    await prisma.orden.deleteMany({ where: { codigoVisible: { startsWith: PREFIJO } } });
    const productos = await prisma.producto.findMany({ where: { nombre: { startsWith: PREFIJO } }, select: { idProducto: true } });
    const idsP = productos.map((x) => x.idProducto);
    await prisma.variante.deleteMany({ where: { idProducto: { in: idsP } } });
    await prisma.producto.deleteMany({ where: { idProducto: { in: idsP } } });
    await prisma.medida.deleteMany({ where: { nombre: { startsWith: PREFIJO } } });
    await prisma.tipoMedida.deleteMany({ where: { nombre: `${PREFIJO}-tipo` } });
    await prisma.subcategoria.deleteMany({ where: { nombre: `${PREFIJO}-sub` } });
    await prisma.categoria.deleteMany({ where: { nombre: `${PREFIJO}-cat` } });
    await prisma.marca.deleteMany({ where: { nombre: { startsWith: PREFIJO } } });
    await servidor.cerrar();
    await prisma.$disconnect();
  });

  it('O8: ordena por unidades de los últimos 90 días (A suma 2 + 4 = 6, B suma 5) y los sin ventas van al final por nombre', async () => {
    expect(await nombres('ordenar=mas_vendidos')).toEqual(['A', 'B', 'C', 'D', 'E']);
  });

  it('las órdenes canceladas o devueltas y las de hace más de 90 días no cuentan', async () => {
    const r = await nombres('ordenar=mas_vendidos&conVentas=true');
    expect(r).not.toContain('C');
    expect(r).not.toContain('D');
  });

  it('F10: conVentas deja solo los que se vendieron, en el orden pedido', async () => {
    expect(await nombres('ordenar=mas_vendidos&conVentas=true')).toEqual(['A', 'B']);
    // Sin el orden de ventas, el filtro igual funciona y el orden es el de siempre (por nombre).
    expect(await nombres('conVentas=true')).toEqual(['A', 'B']);
  });

  it('sin el orden ni el filtro, nada cambia: relevancia por nombre y todos aparecen', async () => {
    expect(await nombres('')).toEqual(['A', 'B', 'C', 'D', 'E']);
  });

  it('el total y los filtros de apoyo respetan conVentas', async () => {
    const r = await servidor.publica(`/productos?q=${PREFIJO}&conVentas=true`);
    expect((r.cuerpo.pagination as Dato).total).toBe(2);
  });

  it('no publica cuántas unidades se vendieron', async () => {
    const r = await servidor.publica(`/productos?q=${PREFIJO}&ordenar=mas_vendidos&conVentas=true`);
    for (const item of r.cuerpo.data as Dato[]) {
      expect(Object.keys(item).some((k) => /vend|unidad/i.test(k))).toBe(false);
    }
  });

  it('F11: ids deja solo esos productos y respeta el resto de filtros; uno que no existe no devuelve nada', async () => {
    expect(await nombres(`ids=${p.b},${p.d}`)).toEqual(['B', 'D']);
    expect(await nombres(`ids=${p.b},${p.d}&conVentas=true`)).toEqual(['B']);
    expect(await nombres('ids=999999999')).toEqual([]);
  });

  it('F11: ids rechaza valores que no son enteros positivos', async () => {
    expect((await servidor.publica('/productos?ids=abc')).status).toBe(400);
  });

  it('rechaza un orden que no existe', async () => {
    const r = await servidor.publica('/productos?ordenar=popular');
    expect(r.status).toBe(400);
  });
});
