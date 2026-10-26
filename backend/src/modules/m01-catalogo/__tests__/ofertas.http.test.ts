import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConsultaPublicaRepositoryPort } from '../interfaces/consulta-publica.interface';
import type { OfertasPort } from '../interfaces/ofertas.port';
import type { ProductoPublicoFicha, ProductoPublicoTarjeta } from '../dtos/m01-catalogo-productos.dto';
import { ConsultaPublicaService } from '../services/consulta-publica.service';
import type { ServidorOfertas } from './helpers/servidor-ofertas';

/**
 * M01 + M06: ofertas en tarjetas y ficha, filtro «en oferta» y conteo de eventos al desactivar. La parte HTTP va contra
 * PostgreSQL real con el M06 de verdad (se activa con `M01_TEST_DATABASE_URL`; sin ella se omite); la de tolerancia a
 * fallos usa dobles y corre siempre.
 */
const URL_BD = process.env.M01_TEST_DATABASE_URL;
const ALEATORIO = Math.random().toString(36).slice(2, 8);
const PREFIJO = `ZZ-OFE-${ALEATORIO}`;

interface Dato {
  [clave: string]: unknown;
}

const AYER = new Date(Date.now() - 36 * 3600_000).toISOString().slice(0, 10);

describe.skipIf(URL_BD === undefined)('M01 · ofertas de M06 (HTTP + PostgreSQL)', () => {
  let servidor: ServidorOfertas;
  let prisma: (typeof import('../../../core/db/client'))['prisma'];
  const auditoria = { registrarAccesoDenegado: vi.fn() };
  const f = {
    categoria: 0,
    subcategoria: 0,
    marca: 0,
    linea: 0,
    otraLinea: 0,
    familiaBlanco: 0,
    familiaAzul: 0,
    blanco: 0,
    azul: 0,
    p1: 0,
    p2: 0,
    p3: 0,
    p4: 0,
    v1g: 0,
    v1c: 0,
    v2g: 0,
    v3g: 0,
    v4g: 0,
  };
  const dato = (r: { cuerpo: { data?: unknown } }): Dato => r.cuerpo.data as Dato;
  const lista = (r: { cuerpo: { data?: unknown } }): Dato[] => r.cuerpo.data as Dato[];

  /** Crea un evento activo desde ayer, todo el día, con las reglas dadas (directo en la base: M06 ya se prueba aparte). */
  const evento = async (
    nombre: string,
    reglas: Array<{
      tipo: 'marca' | 'linea' | 'categoria' | 'subcategoria' | 'producto' | 'variante';
      id: number;
      porcentaje: number;
      excluyeColor?: number;
    }>,
    sobre: { fechaInicio?: string; estado?: 'activo' | 'inactivo'; excluyeFamilia?: number } = {},
  ): Promise<number> => {
    const e = await prisma.eventoDescuento.create({
      data: {
        nombre: `${PREFIJO} ${nombre}`,
        fechaInicio: new Date(`${sobre.fechaInicio ?? AYER}T00:00:00.000Z`),
        estado: sobre.estado ?? 'activo',
      },
    });
    for (const r of reglas) {
      const regla = await prisma.eventoRegla.create({
        data: { idEvento: e.idEvento, tipoObjetivo: r.tipo, idObjetivo: r.id, porcentaje: r.porcentaje },
      });
      if (r.excluyeColor !== undefined) {
        await prisma.eventoExclusion.create({
          data: { idEvento: e.idEvento, idRegla: regla.idRegla, tipo: 'color', idObjetivo: r.excluyeColor },
        });
      }
    }
    if (sobre.excluyeFamilia !== undefined) {
      await prisma.eventoExclusion.create({
        data: { idEvento: e.idEvento, tipo: 'familia_color', idObjetivo: sobre.excluyeFamilia },
      });
    }
    return e.idEvento;
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_BD ?? '';
    ({ prisma } = await import('../../../core/db/client.js'));
    const { levantarServidorOfertas } = await import('./helpers/servidor-ofertas.js');
    servidor = await levantarServidorOfertas(auditoria);

    const categoria = await prisma.categoria.create({ data: { nombre: `${PREFIJO}-cat` } });
    f.categoria = categoria.idCategoria;
    f.subcategoria = (
      await prisma.subcategoria.create({ data: { idCategoria: f.categoria, nombre: `${PREFIJO}-sub` } })
    ).idSubcategoria;
    f.marca = (
      await prisma.marca.create({
        data: { nombre: `${PREFIJO}-marca`, logotipo: Buffer.from('x'), logotipoMimeType: 'image/png' },
      })
    ).idMarca;
    f.linea = (await prisma.linea.create({ data: { idMarca: f.marca, nombre: `${PREFIJO}-linea` } })).idLinea;
    f.otraLinea = (await prisma.linea.create({ data: { idMarca: f.marca, nombre: `${PREFIJO}-otra` } })).idLinea;
    const tm = await prisma.tipoMedida.create({ data: { nombre: `${PREFIJO}-tipo`, abreviatura: `Y${ALEATORIO}` } });
    const medida = async (nombre: string, valor: number): Promise<number> =>
      (await prisma.medida.create({ data: { idTipoMedida: tm.idTipoMedida, nombre: `${PREFIJO} ${nombre}`, valor } }))
        .idMedida;
    const galon = await medida('galón', 1);
    const cuarto = await medida('cuarto', 0.25);
    f.familiaBlanco = (
      await prisma.familiaColor.create({ data: { nombre: `${PREFIJO} Blancos`, hexadecimal: '#FFFFFF' } })
    ).idFamiliaColor;
    f.familiaAzul = (
      await prisma.familiaColor.create({ data: { nombre: `${PREFIJO} Azules`, hexadecimal: '#0000FF' } })
    ).idFamiliaColor;
    const acabado = await prisma.acabado.create({ data: { nombre: `${PREFIJO} mate` } });
    const color = async (nombre: string, idFamiliaColor: number): Promise<number> =>
      (
        await prisma.color.create({
          data: {
            idMarca: f.marca,
            nombre: `${PREFIJO} ${nombre}`,
            idAcabado: acabado.idAcabado,
            idFamiliaColor,
            hexadecimal: '#112233',
          },
        })
      ).idColor;
    f.blanco = await color('Blanco', f.familiaBlanco);
    f.azul = await color('Azul', f.familiaAzul);
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
    f.p3 = await producto(f.otraLinea, 'P3');
    f.p4 = await producto(null, 'P4');
    for (const idColor of [f.blanco, f.azul])
      await prisma.productoColor.create({ data: { idProducto: f.p1, idColor } });
    const variante = (idProducto: number, idMedida: number, sufijo: string, precio: number): Promise<number> =>
      prisma.variante
        .create({ data: { idProducto, idMedida, sku: `${PREFIJO}-${sufijo}`, precioVigente: precio } })
        .then((v) => v.idVariante);
    f.v1g = await variante(f.p1, galon, 'P1G', 100000);
    f.v1c = await variante(f.p1, cuarto, 'P1C', 30000);
    f.v2g = await variante(f.p2, galon, 'P2G', 80000);
    f.v3g = await variante(f.p3, galon, 'P3G', 60000);
    f.v4g = await variante(f.p4, galon, 'P4G', 40000);
  });

  beforeEach(async () => {
    await prisma.eventoDescuento.deleteMany({ where: { nombre: { startsWith: PREFIJO } } });
  });

  afterAll(async () => {
    const productos = [f.p1, f.p2, f.p3, f.p4];
    await prisma.eventoDescuento.deleteMany({ where: { nombre: { startsWith: PREFIJO } } });
    await prisma.variante.deleteMany({ where: { idProducto: { in: productos } } });
    await prisma.productoColor.deleteMany({ where: { idProducto: { in: productos } } });
    await prisma.producto.deleteMany({ where: { idProducto: { in: productos } } });
    await prisma.color.deleteMany({ where: { idColor: { in: [f.blanco, f.azul] } } });
    await prisma.acabado.deleteMany({ where: { nombre: `${PREFIJO} mate` } });
    await prisma.familiaColor.deleteMany({ where: { idFamiliaColor: { in: [f.familiaBlanco, f.familiaAzul] } } });
    await prisma.medida.deleteMany({ where: { nombre: { startsWith: PREFIJO } } });
    await prisma.tipoMedida.deleteMany({ where: { nombre: `${PREFIJO}-tipo` } });
    await prisma.linea.deleteMany({ where: { idLinea: { in: [f.linea, f.otraLinea] } } });
    await prisma.marca.deleteMany({ where: { idMarca: f.marca } });
    await prisma.subcategoria.deleteMany({ where: { nombre: `${PREFIJO}-sub` } });
    await prisma.categoria.deleteMany({ where: { nombre: `${PREFIJO}-cat` } });
    await servidor.cerrar();
    await prisma.$disconnect();
  });

  describe('tarjetas y filtro «en oferta»', () => {
    const listar = (consulta = '') => servidor.publica(`/productos?idMarca=${f.marca}&limite=50${consulta}`);
    const porNombre = (r: { cuerpo: { data?: unknown } }): Record<string, Dato> =>
      Object.fromEntries(lista(r).map((t) => [String(t.nombre).replace(`${PREFIJO} `, ''), t]));

    it('sin eventos ninguna tarjeta trae oferta y «en oferta» no devuelve nada', async () => {
      const todos = await listar();
      expect(lista(todos)).toHaveLength(4);
      expect(lista(todos).every((t) => t.oferta === null)).toBe(true);
      const ofertas = await listar('&enOferta=true');
      expect([ofertas.status, lista(ofertas), ofertas.cuerpo.pagination]).toMatchObject([200, [], { total: 0 }]);
    });

    it('la tarjeta trae la variante en oferta de menor precio, con su etiqueta, y el resto queda sin oferta', async () => {
      await evento('Miércoles de color', [{ tipo: 'linea', id: f.linea, porcentaje: 15 }]);
      const t = porNombre(await listar());
      expect(t.P1?.oferta).toEqual({
        nombre: `${PREFIJO} Miércoles de color`,
        porcentaje: 15,
        precioAntes: 30000,
        precioConOferta: 25500,
      });
      expect(t.P2?.oferta).toEqual({
        nombre: `${PREFIJO} Miércoles de color`,
        porcentaje: 15,
        precioAntes: 80000,
        precioConOferta: 68000,
      });
      expect(t.P3?.oferta).toBeNull(); // otra línea
      expect(t.P4?.oferta).toBeNull(); // sin línea
      // `precioDesde` sigue siendo el mínimo de las variantes (sin oferta)
      expect(t.P1?.precioDesde).toBe(30000);
    });

    it('«en oferta» deja solo los productos con oferta, mantiene el resto de filtros y pagina', async () => {
      await evento('Línea', [{ tipo: 'linea', id: f.linea, porcentaje: 10 }]);
      const r = await listar('&enOferta=true');
      expect(Object.keys(porNombre(r)).sort()).toEqual(['P1', 'P2']);
      expect(r.cuerpo.pagination).toMatchObject({ total: 2 });
      expect(lista(r).every((t) => t.oferta !== null)).toBe(true);
      const busqueda = await listar('&enOferta=true&busqueda=P2');
      expect(lista(busqueda).map((t) => t.nombre)).toEqual([`${PREFIJO} P2`]);
      const paginada = await servidor.publica(`/productos?idMarca=${f.marca}&enOferta=true&limite=1&pagina=2`);
      expect(paginada.cuerpo.pagination).toMatchObject({
        pagina: 2,
        limite: 1,
        total: 2,
      });
      // enOferta=false se comporta como sin filtro
      expect(lista(await listar('&enOferta=false'))).toHaveLength(4);
    });

    it('un evento apagado, que aún no empieza o que ya terminó no pone oferta', async () => {
      await evento('Apagado', [{ tipo: 'marca', id: f.marca, porcentaje: 20 }], { estado: 'inactivo' });
      await evento('Futuro', [{ tipo: 'marca', id: f.marca, porcentaje: 20 }], { fechaInicio: '2099-01-01' });
      const r = await listar('&enOferta=true');
      expect(lista(r)).toEqual([]);
    });

    it('entre varios eventos gana el de mayor porcentaje, sin sumarse', async () => {
      await evento('Uno', [{ tipo: 'linea', id: f.linea, porcentaje: 10 }]);
      await evento('Dos', [{ tipo: 'marca', id: f.marca, porcentaje: 25 }]);
      const t = porNombre(await listar());
      expect(t.P1?.oferta).toMatchObject({ porcentaje: 25, precioConOferta: 22500 });
      expect(t.P4?.oferta).toMatchObject({ porcentaje: 25, precioConOferta: 30000 });
    });

    it('los complementarios también traen su oferta', async () => {
      await evento('Todo', [{ tipo: 'marca', id: f.marca, porcentaje: 10 }]);
      const r = await servidor.publica(`/productos/${f.p1}/complementarios`);
      expect(r.status).toBe(200);
      for (const t of lista(r) as unknown as ProductoPublicoTarjeta[]) expect(t.oferta).not.toBeUndefined();
    });
  });

  describe('ficha y ofertas con el color elegido', () => {
    it('la ficha trae la oferta de cada variante (sin elegir color)', async () => {
      await evento('Producto', [{ tipo: 'producto', id: f.p1, porcentaje: 20 }]);
      const ficha = dato(await servidor.publica(`/productos/${f.p1}`)) as unknown as ProductoPublicoFicha;
      const porSku = Object.fromEntries(ficha.variantes.map((v) => [v.sku.replace(`${PREFIJO}-`, ''), v.oferta]));
      expect(porSku.P1G).toMatchObject({ porcentaje: 20, precioAntes: 100000, precioConOferta: 80000 });
      expect(porSku.P1C).toMatchObject({ porcentaje: 20, precioAntes: 30000, precioConOferta: 24000 });
      const sinOferta = dato(await servidor.publica(`/productos/${f.p4}`)) as unknown as ProductoPublicoFicha;
      expect(sinOferta.variantes.every((v) => v.oferta === null)).toBe(true);
    });

    it('con el color elegido se aplican las excepciones: el blanco no entra, el azul sí', async () => {
      await evento('Color', [{ tipo: 'producto', id: f.p1, porcentaje: 15 }], { excluyeFamilia: f.familiaBlanco });
      const consulta = (idColor?: number) =>
        servidor.publica(`/productos/${f.p1}/ofertas${idColor === undefined ? '' : `?idColor=${idColor}`}`);
      const sin = lista(await consulta());
      expect(sin).toHaveLength(2);
      expect(sin.every((o) => o.oferta !== null)).toBe(true); // sin color, la excepción no se evalúa
      expect(lista(await consulta(f.blanco)).every((o) => o.oferta === null)).toBe(true);
      const azul = lista(await consulta(f.azul));
      expect(azul.map((o) => (o.oferta as Dato).porcentaje)).toEqual([15, 15]);
      expect(azul.map((o) => o.idVariante).sort()).toEqual([f.v1c, f.v1g].sort());
    });

    it('un producto que no se ve responde 404 y un id mal escrito, 400', async () => {
      expect((await servidor.publica('/productos/987654321/ofertas')).status).toBe(404);
      expect((await servidor.publica('/productos/abc/ofertas')).status).toBe(400);
      expect((await servidor.publica(`/productos/${f.p1}/ofertas?idColor=-1`)).status).toBe(400);
    });
  });

  describe('impacto de desactivar (reglasComerciales)', () => {
    const rutas = (): Array<[string, string]> => [
      ['marca', `/marcas/${f.marca}`],
      ['línea', `/lineas/${f.linea}`],
      ['categoría', `/categorias/${f.categoria}`],
      ['subcategoría', `/subcategorias/${f.subcategoria}`],
      ['producto', `/productos/${f.p1}`],
      ['variante', `/variantes/${f.v1g}`],
    ];
    const reglasDe = async (ruta: string): Promise<unknown> =>
      (dato(await servidor.admin('GET', `${ruta}/impacto-desactivacion`)) as Dato).reglasComerciales;

    it('sin eventos vale 0', async () => {
      for (const [, ruta] of rutas()) expect(await reglasDe(ruta)).toBe(0);
    });

    it('cuenta los eventos en curso y programados que apuntan a la entidad, y no los apagados ni los de otra', async () => {
      await evento('A', [
        { tipo: 'marca', id: f.marca, porcentaje: 5 },
        { tipo: 'linea', id: f.linea, porcentaje: 5 },
        { tipo: 'categoria', id: f.categoria, porcentaje: 5 },
        { tipo: 'subcategoria', id: f.subcategoria, porcentaje: 5 },
        { tipo: 'producto', id: f.p1, porcentaje: 5 },
        { tipo: 'variante', id: f.v1g, porcentaje: 5 },
      ]);
      await evento('Programado', [{ tipo: 'linea', id: f.linea, porcentaje: 5 }], { fechaInicio: '2099-01-01' });
      await evento('Apagado', [{ tipo: 'linea', id: f.linea, porcentaje: 5 }], { estado: 'inactivo' });
      expect(await reglasDe(`/lineas/${f.linea}`)).toBe(2);
      expect(await reglasDe(`/lineas/${f.otraLinea}`)).toBe(0);
      for (const ruta of [
        `/marcas/${f.marca}`,
        `/categorias/${f.categoria}`,
        `/subcategorias/${f.subcategoria}`,
        `/productos/${f.p1}`,
        `/variantes/${f.v1g}`,
      ]) {
        expect(await reglasDe(ruta)).toBe(1);
      }
      expect(await reglasDe(`/productos/${f.p2}`)).toBe(0);
    });

    it('desactivar una línea con eventos exige confirmar y avisa cuántos (HU-CAT-11)', async () => {
      await evento('A', [{ tipo: 'linea', id: f.otraLinea, porcentaje: 5 }]);
      const sin = await servidor.admin('PATCH', `/lineas/${f.otraLinea}/estado`, { estado: 'inactivo' });
      expect([sin.status, sin.cuerpo.error?.code]).toEqual([409, 'CONFIRMACION_REQUERIDA']);
      expect(sin.cuerpo.error?.details).toMatchObject({ reglasComerciales: 1 });
      expect((await prisma.linea.findUniqueOrThrow({ where: { idLinea: f.otraLinea } })).estado).toBe('activo');
      const con = await servidor.admin('PATCH', `/lineas/${f.otraLinea}/estado`, {
        estado: 'inactivo',
        confirmar: true,
      });
      expect(con.status).toBe(200);
      await prisma.linea.update({ where: { idLinea: f.otraLinea }, data: { estado: 'activo' } });
    });
  });
});

describe('M01 · el catálogo no depende de que M06 responda', () => {
  const tarjeta = (idProducto: number): ProductoPublicoTarjeta => ({
    idProducto,
    nombre: `P${idProducto}`,
    marca: 'M',
    linea: null,
    categoria: 'C',
    subcategoria: 'S',
    precioDesde: 1000,
    tieneColor: false,
    disponibilidad: 'disponible',
    idImagenPrincipal: null,
    esCombo: false,
    compraBloqueada: false,
    oferta: null,
  });
  const fichaCon = (): ProductoPublicoFicha =>
    ({ variantes: [{ idVariante: 5, oferta: null }] }) as unknown as ProductoPublicoFicha;
  const repo = (): ConsultaPublicaRepositoryPort =>
    ({
      listar: vi.fn().mockResolvedValue({ items: [tarjeta(1), tarjeta(2)], total: 2 }),
      ficha: vi.fn().mockResolvedValue(fichaCon()),
      complementarios: vi.fn().mockResolvedValue([tarjeta(3)]),
    }) as unknown as ConsultaPublicaRepositoryPort;
  const query = { pagina: 1, limite: 20, ordenar: 'nombre' as const };
  const roto: OfertasPort = {
    idsProductosEnOferta: () => Promise.reject(new Error('M06 caído')),
    ofertasDeProductos: () => Promise.reject(new Error('M06 caído')),
    preciosDeVariantes: () => Promise.reject(new Error('M06 caído')),
  };

  it('sin M06 conectado, las tarjetas y la ficha salen sin oferta y «en oferta» queda vacío', async () => {
    const r = repo();
    const servicio = new ConsultaPublicaService(r);
    expect((await servicio.listar(query)).items.every((t) => t.oferta === null)).toBe(true);
    expect((await servicio.ficha(1)).variantes[0]?.oferta).toBeNull();
    await servicio.listar({ ...query, enOferta: true });
    expect(r.listar).toHaveBeenLastCalledWith({ ...query, enOferta: true }, []);
  });

  it('si M06 falla, el listado, la ficha y los complementarios se ven igual, sin oferta', async () => {
    const servicio = new ConsultaPublicaService(repo(), roto);
    expect((await servicio.listar(query)).items).toHaveLength(2);
    expect((await servicio.ficha(1)).variantes).toHaveLength(1);
    expect(await servicio.complementarios(1)).toHaveLength(1);
    expect(await servicio.ofertasProducto(1, {})).toEqual([{ idVariante: 5, oferta: null }]);
  });

  it('pedir «en oferta» sí falla si M06 falla: devolver una lista vacía engañaría a quien lo pide', async () => {
    await expect(new ConsultaPublicaService(repo(), roto).listar({ ...query, enOferta: true })).rejects.toThrow(
      'M06 caído',
    );
  });

  it('descarta del resultado de M06 las claves que no son públicas (idEvento)', async () => {
    const conIdEvento: OfertasPort = {
      idsProductosEnOferta: () => Promise.resolve([1]),
      ofertasDeProductos: (ids) =>
        Promise.resolve(
          ids.map((idProducto) => ({
            idProducto,
            oferta: { idEvento: 9, nombre: 'E', porcentaje: 10, precioAntes: 100, precioConOferta: 90 } as {
              nombre: string;
              porcentaje: number;
              precioAntes: number;
              precioConOferta: number;
            },
          })),
        ),
      preciosDeVariantes: () => Promise.resolve([]),
    };
    const t = (await new ConsultaPublicaService(repo(), conIdEvento).listar(query)).items[0];
    expect(t?.oferta).toEqual({ nombre: 'E', porcentaje: 10, precioAntes: 100, precioConOferta: 90 });
  });
});
