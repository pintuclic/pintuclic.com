import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fechaBogota } from '../../m14-patrocinios/services/fechas';
import type { PatrocinioListadoPort } from '../dtos/m02-busqueda.dto';
import type { ServidorBusqueda } from './helpers/servidor-ofertas';

/**
 * M02 + M14: el patrocinio en el listado (contrato M02 · O7). Contra PostgreSQL real con el M14 de verdad (se activa
 * con `M01_TEST_DATABASE_URL`; sin ella se omite).
 */
const URL_BD = process.env.M01_TEST_DATABASE_URL;
const ALEATORIO = Math.random().toString(36).slice(2, 8);
const PREFIJO = `ZZ-M02PAT-${ALEATORIO}`;
const AYER = fechaBogota(new Date(Date.now() - 24 * 3600_000));
const EN_UNA_SEMANA = fechaBogota(new Date(Date.now() + 7 * 24 * 3600_000));
const HACE_UNA_SEMANA = fechaBogota(new Date(Date.now() - 7 * 24 * 3600_000));
const HACE_DOS_SEMANAS = fechaBogota(new Date(Date.now() - 14 * 24 * 3600_000));

interface Dato {
  [clave: string]: unknown;
}

describe.skipIf(URL_BD === undefined)('M02 · patrocinio en el listado (HTTP + PostgreSQL)', () => {
  let servidor: ServidorBusqueda;
  let prisma: (typeof import('../../../core/db/client'))['prisma'];
  const auditoria = { registrarAccesoDenegado: vi.fn() };
  const f = { marca: 0, linea: 0, a: 0, b: 0, c: 0, d: 0, e: 0 };
  const lista = (r: { cuerpo: { data?: unknown } }): Dato[] => r.cuerpo.data as Dato[];
  const nombres = (r: { cuerpo: { data?: unknown } }): string[] => lista(r).map((t) => String(t.nombre).replace(`${PREFIJO} `, ''));
  const buscar = (consulta = '', s: ServidorBusqueda = servidor) => s.publica(`/productos?idMarca=${f.marca}&limite=48${consulta}`);

  const campania = async (
    sufijo: string,
    objetivos: Array<{ tipo: 'producto' | 'linea' | 'marca'; id: number }>,
    sobre: { prioridad?: number; ubicaciones?: Array<'listado' | 'inicio' | 'complementarios'>; estado?: 'activo' | 'inactivo'; fechaInicio?: string; fechaFin?: string } = {},
  ): Promise<number> =>
    (
      await prisma.campaniaPatrocinio.create({
        data: {
          nombre: `${PREFIJO} ${sufijo}`,
          fechaInicio: new Date(`${sobre.fechaInicio ?? AYER}T00:00:00.000Z`),
          fechaFin: new Date(`${sobre.fechaFin ?? EN_UNA_SEMANA}T00:00:00.000Z`),
          prioridad: sobre.prioridad ?? 0,
          estado: sobre.estado ?? 'activo',
          ubicaciones: sobre.ubicaciones ?? ['listado'],
          objetivos: { create: objetivos.map((o) => ({ tipo: o.tipo, idReferencia: o.id })) },
        },
      })
    ).idCampania;

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_BD ?? '';
    ({ prisma } = await import('../../../core/db/client.js'));
    const { levantarServidorBusqueda } = await import('./helpers/servidor-ofertas.js');
    servidor = await levantarServidorBusqueda(auditoria);

    const categoria = await prisma.categoria.create({ data: { nombre: `${PREFIJO}-cat` } });
    const subcategoria = await prisma.subcategoria.create({ data: { idCategoria: categoria.idCategoria, nombre: `${PREFIJO}-sub` } });
    f.marca = (await prisma.marca.create({ data: { nombre: `${PREFIJO}-marca`, logotipo: Buffer.from('x'), logotipoMimeType: 'image/png' } })).idMarca;
    f.linea = (await prisma.linea.create({ data: { idMarca: f.marca, nombre: `${PREFIJO}-linea` } })).idLinea;
    const tipo = await prisma.tipoMedida.create({ data: { nombre: `${PREFIJO}-tipo`, abreviatura: `Y${ALEATORIO}` } });
    const galon = await prisma.medida.create({ data: { idTipoMedida: tipo.idTipoMedida, nombre: `${PREFIJO} galón`, valor: 1 } });
    // Nombres con orden alfabético conocido: Alfa < Beta < Gama < Delta... se llaman por letra para que el orden normal sea A, B, C, D, E.
    const producto = async (n: string, idLinea: number | null, precio: number): Promise<number> => {
      const p = await prisma.producto.create({
        data: { idMarca: f.marca, ...(idLinea === null ? {} : { idLinea }), idSubcategoria: subcategoria.idSubcategoria, nombre: `${PREFIJO} ${n}`, publicado: true, descripcion: n === 'C' ? 'contiene vinilo' : null },
      });
      await prisma.variante.create({ data: { idProducto: p.idProducto, idMedida: galon.idMedida, sku: `${PREFIJO}-${n}`, precioVigente: precio } });
      return p.idProducto;
    };
    f.a = await producto('A', null, 50000);
    f.b = await producto('B', f.linea, 40000);
    f.c = await producto('C', f.linea, 30000);
    f.d = await producto('D', null, 20000);
    f.e = await producto('E', null, 10000);
  });

  beforeEach(async () => {
    await prisma.campaniaPatrocinio.deleteMany({ where: { nombre: { startsWith: PREFIJO } } });
  });

  afterAll(async () => {
    await prisma.campaniaPatrocinio.deleteMany({ where: { nombre: { startsWith: PREFIJO } } });
    await prisma.variante.deleteMany({ where: { sku: { startsWith: PREFIJO } } });
    await prisma.producto.deleteMany({ where: { nombre: { startsWith: PREFIJO } } });
    await prisma.medida.deleteMany({ where: { nombre: { startsWith: PREFIJO } } });
    await prisma.tipoMedida.deleteMany({ where: { nombre: `${PREFIJO}-tipo` } });
    await prisma.linea.deleteMany({ where: { idLinea: f.linea } });
    await prisma.marca.deleteMany({ where: { idMarca: f.marca } });
    await prisma.subcategoria.deleteMany({ where: { nombre: `${PREFIJO}-sub` } });
    await prisma.categoria.deleteMany({ where: { nombre: `${PREFIJO}-cat` } });
    await servidor.cerrar();
    await prisma.$disconnect();
  });

  it('sin campañas el orden es el de siempre y nadie va marcado como patrocinado', async () => {
    const r = await buscar();
    expect(nombres(r)).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(lista(r).every((t) => t.patrocinado === false && t.idCampania === null)).toBe(true);
  });

  it('sin texto, los de campañas vigentes van primero por prioridad, con la etiqueta y la campaña', async () => {
    const baja = await campania('Baja', [{ tipo: 'producto', id: f.e }], { prioridad: 10 });
    const alta = await campania('Alta', [{ tipo: 'producto', id: f.d }], { prioridad: 90 });
    const r = await buscar();
    expect(nombres(r)).toEqual(['D', 'E', 'A', 'B', 'C']);
    expect(lista(r).slice(0, 2)).toMatchObject([{ patrocinado: true, idCampania: alta }, { patrocinado: true, idCampania: baja }]);
    expect(lista(r).slice(2).every((t) => t.patrocinado === false && t.idCampania === null)).toBe(true);
  });

  it('un patrocinio por línea o por marca adelanta todos sus productos', async () => {
    await campania('Linea', [{ tipo: 'linea', id: f.linea }], { prioridad: 5 });
    expect(nombres(await buscar())).toEqual(['B', 'C', 'A', 'D', 'E']);
    await prisma.campaniaPatrocinio.deleteMany({ where: { nombre: { startsWith: PREFIJO } } });
    await campania('Marca', [{ tipo: 'marca', id: f.marca }], { prioridad: 5 });
    const r = await buscar();
    expect(nombres(r)).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(lista(r).every((t) => t.patrocinado === true)).toBe(true);
  });

  it('el patrocinio no cambia el total, la paginación ni quién aparece', async () => {
    await campania('Alta', [{ tipo: 'producto', id: f.e }], { prioridad: 90 });
    const sin = await servidor.publica(`/productos?idMarca=${f.marca}&limite=2&pagina=1`);
    expect(sin.cuerpo.pagination).toMatchObject({ total: 5, totalPaginas: 3 });
    expect(nombres(sin)).toEqual(['E', 'A']);
    const p3 = await servidor.publica(`/productos?idMarca=${f.marca}&limite=2&pagina=3`);
    expect(nombres(p3)).toEqual(['D']);
    // los conteos de los filtros tampoco cambian
    const filtros = await servidor.publica(`/filtros?idMarca=${f.marca}`);
    expect((filtros.cuerpo.data as Dato).totalResultados).toBe(5);
  });

  it('con texto manda la relevancia: el patrocinado solo desempata entre igual de pertinentes y no mete lo no pertinente', async () => {
    // «vinilo» aparece solo en la descripción de C: el resto tiene relevancia 0 y no debe aparecer aunque esté patrocinado
    await campania('Intruso', [{ tipo: 'producto', id: f.e }], { prioridad: 100 });
    const r = await buscar('&q=vinilo');
    expect(nombres(r)).toEqual(['C']);
    expect((r.cuerpo.pagination as Dato).total).toBe(1);
    // con un término que todos cumplen (la marca), empatan en relevancia y gana el patrocinado
    const todos = await buscar(`&q=${PREFIJO}-marca`);
    expect(nombres(todos)[0]).toBe('E');
  });

  it('con texto, un patrocinado menos pertinente NO pasa por delante de uno más pertinente, pero sí desempata', async () => {
    // «vinilo»: E lo trae en el nombre (peso alto); A y C solo en la descripción (peso bajo, empatan entre sí)
    await prisma.producto.update({ where: { idProducto: f.e }, data: { nombre: `${PREFIJO} E vinilo` } });
    await prisma.producto.update({ where: { idProducto: f.a }, data: { descripcion: 'vinilo suave' } });
    const patro = await campania('Patro', [{ tipo: 'producto', id: f.a }], { prioridad: 100 });
    const r = await buscar('&q=vinilo');
    // E (más pertinente, sin patrocinio) primero; entre A y C, que empatan, gana el patrocinado A
    expect(nombres(r)).toEqual(['E vinilo', 'A', 'C']);
    expect(lista(r)).toMatchObject([{ patrocinado: false }, { patrocinado: true, idCampania: patro }, { patrocinado: false }]);
    await prisma.producto.update({ where: { idProducto: f.e }, data: { nombre: `${PREFIJO} E` } });
    await prisma.producto.update({ where: { idProducto: f.a }, data: { descripcion: null } });
  });

  it('con precio o novedad el patrocinio no actúa', async () => {
    await campania('Alta', [{ tipo: 'producto', id: f.a }], { prioridad: 100 });
    const porPrecio = await buscar('&ordenar=precio_asc');
    expect(nombres(porPrecio)).toEqual(['E', 'D', 'C', 'B', 'A']);
    expect(lista(porPrecio).every((t) => t.patrocinado === false)).toBe(true);
    expect(lista(await buscar('&ordenar=precio_desc')).every((t) => t.patrocinado === false)).toBe(true);
    expect(lista(await buscar('&ordenar=novedad')).every((t) => t.patrocinado === false)).toBe(true);
  });

  it('solo cuentan las campañas vigentes con la ubicación «listado»', async () => {
    await campania('Inicio', [{ tipo: 'producto', id: f.e }], { ubicaciones: ['inicio'] });
    await campania('Inactiva', [{ tipo: 'producto', id: f.d }], { estado: 'inactivo' });
    await campania('Vencida', [{ tipo: 'producto', id: f.c }], { fechaInicio: HACE_DOS_SEMANAS, fechaFin: HACE_UNA_SEMANA });
    expect(nombres(await buscar())).toEqual(['A', 'B', 'C', 'D', 'E']);
  });

  it('un producto en dos campañas sale una vez, con la prioridad más alta', async () => {
    await campania('Baja', [{ tipo: 'marca', id: f.marca }], { prioridad: 10 });
    const alta = await campania('Alta', [{ tipo: 'producto', id: f.c }], { prioridad: 70 });
    const r = await buscar();
    expect(nombres(r)).toEqual(['C', 'A', 'B', 'D', 'E']);
    expect(lista(r)[0]).toMatchObject({ patrocinado: true, idCampania: alta });
  });

  it('el cupo: con más patrocinados que el cupo, solo pasan los de mayor prioridad', async () => {
    const extras: number[] = [];
    const sub = await prisma.subcategoria.findFirstOrThrow({ where: { nombre: `${PREFIJO}-sub` } });
    const tipoMedida = await prisma.medida.findFirstOrThrow({ where: { nombre: `${PREFIJO} galón` } });
    for (let i = 0; i < 9; i++) {
      const p = await prisma.producto.create({ data: { idMarca: f.marca, idSubcategoria: sub.idSubcategoria, nombre: `${PREFIJO} Z${i}`, publicado: true } });
      await prisma.variante.create({ data: { idProducto: p.idProducto, idMedida: tipoMedida.idMedida, sku: `${PREFIJO}-Z${i}`, precioVigente: 1000 } });
      extras.push(p.idProducto);
      await campania(`Z${i}`, [{ tipo: 'producto', id: p.idProducto }], { prioridad: 50 + i });
    }
    const r = await buscar();
    const patrocinados = lista(r).filter((t) => t.patrocinado === true);
    expect(patrocinados).toHaveLength(8);
    expect(nombres(r).slice(0, 8)).toEqual(['Z8', 'Z7', 'Z6', 'Z5', 'Z4', 'Z3', 'Z2', 'Z1']);
    // el noveno (Z0, la de menor prioridad) se queda con su orden normal y sin etiqueta
    expect(lista(r).find((t) => t.nombre === `${PREFIJO} Z0`)).toMatchObject({ patrocinado: false, idCampania: null });
    expect((r.cuerpo.pagination as Dato).total).toBe(14);
    await prisma.variante.deleteMany({ where: { idProducto: { in: extras } } });
    await prisma.campaniaPatrocinio.deleteMany({ where: { nombre: { startsWith: PREFIJO } } });
    await prisma.producto.deleteMany({ where: { idProducto: { in: extras } } });
  });

  it('un patrocinado que no es visible (inactivo) no aparece ni adelanta a nadie', async () => {
    await prisma.producto.update({ where: { idProducto: f.d }, data: { estado: 'inactivo' } });
    await campania('Alta', [{ tipo: 'producto', id: f.d }], { prioridad: 100 });
    expect(nombres(await buscar())).toEqual(['A', 'B', 'C', 'E']);
    await prisma.producto.update({ where: { idProducto: f.d }, data: { estado: 'activo' } });
  });

  describe('si M14 falla', () => {
    const caido: PatrocinioListadoPort = { prioridadesDeProductos: () => Promise.reject(new Error('M14 caído')) };
    let roto: ServidorBusqueda;
    beforeAll(async () => {
      const { levantarServidorBusqueda } = await import('./helpers/servidor-ofertas.js');
      roto = await levantarServidorBusqueda(auditoria, { patrocinio: caido });
    });
    afterAll(async () => {
      await roto.cerrar();
    });

    it('el listado sigue con su orden normal y sin patrocinio', async () => {
      await campania('Alta', [{ tipo: 'producto', id: f.e }], { prioridad: 100 });
      const r = await buscar('', roto);
      expect(r.status).toBe(200);
      expect(nombres(r)).toEqual(['A', 'B', 'C', 'D', 'E']);
      expect(lista(r).every((t) => t.patrocinado === false)).toBe(true);
    });
  });
});
