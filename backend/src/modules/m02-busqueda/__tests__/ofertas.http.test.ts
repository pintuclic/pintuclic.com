import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrecioFinalPort } from '../dtos/m02-busqueda.dto';
import { PrecioFinalM06Adapter } from '../services/precio-final-m06.adapter';
import type { ServidorBusqueda } from './helpers/servidor-ofertas';

/**
 * M02 + M06: precio final con evento, etiqueta de oferta y filtro «en oferta». La parte HTTP va contra PostgreSQL real
 * con el M06 de verdad (se activa con `M01_TEST_DATABASE_URL`; sin ella se omite). El adaptador de precios se prueba
 * siempre, con un doble.
 */
const URL_BD = process.env.M01_TEST_DATABASE_URL;
const ALEATORIO = Math.random().toString(36).slice(2, 8);
const PREFIJO = `ZZ-M02OFE-${ALEATORIO}`;
const AYER = new Date(Date.now() - 36 * 3600_000).toISOString().slice(0, 10);

interface Dato {
  [clave: string]: unknown;
}

describe('M02 · PrecioFinalM06Adapter', () => {
  it('pide a M06 en lotes de 500 y deja fuera lo no vendible o sin precio (queda el precio base)', async () => {
    const ids = Array.from({ length: 1201 }, (_v, i) => i + 1);
    const lotes: number[] = [];
    const adaptador = new PrecioFinalM06Adapter({
      preciosDeVariantes: (consultas) => {
        lotes.push(consultas.length);
        return Promise.resolve(
          consultas.map((c) => ({
            idVariante: c.idVariante,
            vendible: c.idVariante !== 2,
            precioConOferta: c.idVariante === 3 ? null : c.idVariante * 10,
          })),
        );
      },
    });
    const mapa = await adaptador.preciosFinales(ids, { idUsuario: null });
    expect(lotes).toEqual([500, 500, 201]);
    expect(mapa.get(1)).toBe(10);
    expect(mapa.has(2)).toBe(false); // no vendible
    expect(mapa.has(3)).toBe(false); // sin precio
    expect(mapa.get(1201)).toBe(12010);
    expect(mapa.size).toBe(1199);
  });

  it('sin variantes no consulta a M06', async () => {
    const preciosDeVariantes = vi.fn();
    const mapa = await new PrecioFinalM06Adapter({ preciosDeVariantes }).preciosFinales([], { idUsuario: null });
    expect(mapa.size).toBe(0);
    expect(preciosDeVariantes).not.toHaveBeenCalled();
  });
});

describe.skipIf(URL_BD === undefined)('M02 · ofertas de M06 (HTTP + PostgreSQL)', () => {
  let servidor: ServidorBusqueda;
  let prisma: (typeof import('../../../core/db/client'))['prisma'];
  const auditoria = { registrarAccesoDenegado: vi.fn() };
  const f = { categoria: 0, subcategoria: 0, marca: 0, linea: 0, p1: 0, p2: 0, p3: 0 };
  const lista = (r: { cuerpo: { data?: unknown } }): Dato[] => r.cuerpo.data as Dato[];
  const nombres = (r: { cuerpo: { data?: unknown } }): string[] =>
    lista(r).map((t) => String(t.nombre).replace(`${PREFIJO} `, ''));
  const buscar = (consulta = '', s: ServidorBusqueda = servidor) =>
    s.publica(`/productos?idMarca=${f.marca}&limite=48${consulta}`);

  const evento = async (
    nombre: string,
    porcentaje: number,
    sobre: { fechaInicio?: string; estado?: 'activo' | 'inactivo' } = {},
  ): Promise<void> => {
    const e = await prisma.eventoDescuento.create({
      data: {
        nombre: `${PREFIJO} ${nombre}`,
        fechaInicio: new Date(`${sobre.fechaInicio ?? AYER}T00:00:00.000Z`),
        estado: sobre.estado ?? 'activo',
      },
    });
    await prisma.eventoRegla.create({
      data: { idEvento: e.idEvento, tipoObjetivo: 'linea', idObjetivo: f.linea, porcentaje },
    });
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_BD ?? '';
    ({ prisma } = await import('../../../core/db/client.js'));
    const { levantarServidorBusqueda } = await import('./helpers/servidor-ofertas.js');
    servidor = await levantarServidorBusqueda(auditoria);

    f.categoria = (await prisma.categoria.create({ data: { nombre: `${PREFIJO}-cat` } })).idCategoria;
    f.subcategoria = (
      await prisma.subcategoria.create({ data: { idCategoria: f.categoria, nombre: `${PREFIJO}-sub` } })
    ).idSubcategoria;
    f.marca = (
      await prisma.marca.create({
        data: { nombre: `${PREFIJO}-marca`, logotipo: Buffer.from('x'), logotipoMimeType: 'image/png' },
      })
    ).idMarca;
    f.linea = (await prisma.linea.create({ data: { idMarca: f.marca, nombre: `${PREFIJO}-linea` } })).idLinea;
    const tm = await prisma.tipoMedida.create({ data: { nombre: `${PREFIJO}-tipo`, abreviatura: `Y${ALEATORIO}` } });
    const medida = async (nombre: string, valor: number): Promise<number> =>
      (await prisma.medida.create({ data: { idTipoMedida: tm.idTipoMedida, nombre: `${PREFIJO} ${nombre}`, valor } }))
        .idMedida;
    const galon = await medida('galón', 1);
    const cuarto = await medida('cuarto', 0.25);
    const producto = async (idLinea: number | null, nombre: string): Promise<number> =>
      (
        await prisma.producto.create({
          data: {
            idMarca: f.marca,
            ...(idLinea === null ? {} : { idLinea }),
            idSubcategoria: f.subcategoria,
            nombre: `${PREFIJO} ${nombre}`,
            publicado: true,
          },
        })
      ).idProducto;
    f.p1 = await producto(f.linea, 'P1');
    f.p2 = await producto(f.linea, 'P2');
    f.p3 = await producto(null, 'P3');
    const variante = (idProducto: number, idMedida: number, sufijo: string, precio: number): Promise<unknown> =>
      prisma.variante.create({ data: { idProducto, idMedida, sku: `${PREFIJO}-${sufijo}`, precioVigente: precio } });
    await variante(f.p1, galon, 'P1G', 100000);
    await variante(f.p1, cuarto, 'P1C', 30000);
    await variante(f.p2, galon, 'P2G', 80000);
    await variante(f.p3, galon, 'P3G', 40000);
  });

  beforeEach(async () => {
    await prisma.eventoDescuento.deleteMany({ where: { nombre: { startsWith: PREFIJO } } });
  });

  afterAll(async () => {
    const productos = [f.p1, f.p2, f.p3];
    await prisma.eventoDescuento.deleteMany({ where: { nombre: { startsWith: PREFIJO } } });
    await prisma.variante.deleteMany({ where: { idProducto: { in: productos } } });
    await prisma.producto.deleteMany({ where: { idProducto: { in: productos } } });
    await prisma.medida.deleteMany({ where: { nombre: { startsWith: PREFIJO } } });
    await prisma.tipoMedida.deleteMany({ where: { nombre: `${PREFIJO}-tipo` } });
    await prisma.linea.deleteMany({ where: { idLinea: f.linea } });
    await prisma.marca.deleteMany({ where: { idMarca: f.marca } });
    await prisma.subcategoria.deleteMany({ where: { nombre: `${PREFIJO}-sub` } });
    await prisma.categoria.deleteMany({ where: { nombre: `${PREFIJO}-cat` } });
    await servidor.cerrar();
    await prisma.$disconnect();
  });

  it('sin eventos: precio base, tarjetas sin oferta y «en oferta» sin resultados', async () => {
    const r = await buscar('&ordenar=precio_asc');
    expect(nombres(r)).toEqual(['P1', 'P3', 'P2']);
    expect(lista(r).map((t) => t.precioDesde)).toEqual([30000, 40000, 80000]);
    expect(lista(r).every((t) => t.oferta === null)).toBe(true);
    const ofertas = await buscar('&enOferta=true');
    expect([ofertas.status, lista(ofertas), ofertas.cuerpo.pagination]).toMatchObject([200, [], { total: 0 }]);
  });

  it('con un evento: el precio «desde» baja, la tarjeta trae la etiqueta y solo los de la línea están en oferta', async () => {
    await evento('Miércoles de color', 15);
    const r = await buscar('&ordenar=precio_asc');
    expect(nombres(r)).toEqual(['P1', 'P3', 'P2']);
    const t = Object.fromEntries(lista(r).map((x) => [String(x.nombre).replace(`${PREFIJO} `, ''), x]));
    expect(t.P1?.precioDesde).toBe(25500);
    expect(t.P1?.oferta).toEqual({
      nombre: `${PREFIJO} Miércoles de color`,
      porcentaje: 15,
      precioAntes: 30000,
      precioConOferta: 25500,
    });
    expect(t.P2?.precioDesde).toBe(68000);
    expect(t.P3?.precioDesde).toBe(40000);
    expect(t.P3?.oferta).toBeNull();

    const soloOfertas = await buscar('&enOferta=true&ordenar=precio_desc');
    expect(nombres(soloOfertas)).toEqual(['P2', 'P1']);
    expect(soloOfertas.cuerpo.pagination).toMatchObject({ total: 2 });
  });

  it('el rango de precio y el orden usan el precio con oferta (F5, O5)', async () => {
    await evento('Rebaja', 15);
    // P1 vale 30.000 de lista pero 25.500 con la oferta: entra en un tope de 26.000 solo por el precio final
    expect(nombres(await buscar('&precioMax=26000'))).toEqual(['P1']);
    expect(nombres(await buscar('&precioMin=60000'))).toEqual(['P2']); // 80.000 → 68.000
    // el orden descendente sigue al precio final: P2 (68.000) > P3 (40.000) > P1 (25.500)
    expect(nombres(await buscar('&ordenar=precio_desc'))).toEqual(['P2', 'P3', 'P1']);
  });

  it('«en oferta» se combina con búsqueda y paginación', async () => {
    await evento('Rebaja', 10);
    expect(nombres(await buscar('&enOferta=true&q=P2'))).toEqual(['P2']);
    const pagina2 = await servidor.publica(`/productos?idMarca=${f.marca}&enOferta=true&limite=1&pagina=2`);
    expect(pagina2.cuerpo.pagination).toMatchObject({ pagina: 2, limite: 1, total: 2 });
    expect(lista(pagina2)).toHaveLength(1);
  });

  it('un evento inactivo o que aún no empieza no cuenta', async () => {
    await evento('Apagado', 20, { estado: 'inactivo' });
    await evento('Futuro', 20, { fechaInicio: '2999-01-01' });
    const r = await buscar('&enOferta=true');
    expect(lista(r)).toEqual([]);
    expect((await buscar()).cuerpo.data).toSatisfy((d: Dato[]) => d.every((t) => t.oferta === null));
  });

  it('las opciones de filtro ven el precio con oferta y respetan «en oferta»', async () => {
    await evento('Rebaja', 15);
    const r = await servidor.publica(`/filtros?idMarca=${f.marca}&enOferta=true`);
    const datos = r.cuerpo.data as Dato;
    expect(datos.totalResultados).toBe(2);
    expect(datos.precio).toEqual({ minimo: 25500, maximo: 68000 });
  });

  describe('si M06 falla', () => {
    const fallo: PrecioFinalPort = { preciosFinales: () => Promise.reject(new Error('M06 caído')) };
    const ofertasCaidas = {
      idsProductosEnOferta: () => Promise.reject(new Error('M06 caído')),
      ofertasDeProductos: () => Promise.reject(new Error('M06 caído')),
    };
    let roto: ServidorBusqueda;

    beforeAll(async () => {
      const { levantarServidorBusqueda } = await import('./helpers/servidor-ofertas.js');
      roto = await levantarServidorBusqueda(auditoria, { precioFinal: fallo, ofertas: ofertasCaidas });
    });
    afterAll(async () => {
      await roto.cerrar();
    });

    it('el listado sigue: precio base y tarjetas sin oferta', async () => {
      const r = await buscar('&ordenar=precio_asc', roto);
      expect(r.status).toBe(200);
      expect(lista(r).map((t) => t.precioDesde)).toEqual([30000, 40000, 80000]);
      expect(lista(r).every((t) => t.oferta === null)).toBe(true);
    });

    it('«en oferta» no responde «ninguna oferta»: falla (500) para no engañar', async () => {
      const r = await buscar('&enOferta=true', roto);
      expect(r.status).toBe(500);
    });
  });
});
