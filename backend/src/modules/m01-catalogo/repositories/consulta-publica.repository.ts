import type { Prisma } from '@prisma/client';
import { prisma } from '../../../core/db/client';
import type {
  CategoriaPublica,
  Disponibilidad,
  FiltrosPublicos,
  ListarColoresProductoRequest,
  ListarProductosPublicosRequest,
  ProductoPublicoFicha,
  ProductoPublicoTarjeta,
  RendimientoAproximado,
  VariantePublica,
} from '../dtos/m01-catalogo-productos.dto';
import type { ImagenBytes, LogotipoMarca, Pagina } from '../interfaces/catalogo.interface';
import type { ConsultaPublicaRepositoryPort } from '../interfaces/consulta-publica.interface';
import type { ColoresDeProducto } from '../interfaces/productos.interface';
import { ORDEN_GALERIA } from './imagenes.repository';
import { productoVisible } from './prisma-comun';
import { consultarColoresOfrecidos, derivarClaseColor } from './productos.repository';

const contiene = (texto: string): Prisma.StringFilter => ({ contains: texto, mode: 'insensitive' });

/** U1 + algo que comprar: un producto sin variantes activas no se muestra aunque quede publicado. */
const visible = (extra: Prisma.ProductoWhereInput = {}): Prisma.ProductoWhereInput =>
  productoVisible({ AND: [{ variantes: { some: { estado: 'activo' } } }, extra] });

/** La imagen de portada de una tarjeta: la principal o, si no hay, la primera de la galería. */
function portada(imagenes: ReadonlyArray<{ idImagen: number; esPrincipal: boolean }>): number | null {
  return (imagenes.find((i) => i.esPrincipal) ?? imagenes[0])?.idImagen ?? null;
}

const disponibilidad = (existencias: readonly number[]): Disponibilidad =>
  existencias.some((e) => e > 0) ? 'disponible' : 'agotado';

/** U6: rendimiento por galón × galones de la medida (valor × equivalencia del tipo); null si falta algo. */
export function rendimientoDeMedida(args: {
  rendimientoMin: number | null;
  rendimientoMax: number | null;
  valor: number;
  equivalenciaGalones: number | null;
}): RendimientoAproximado | null {
  const { rendimientoMin, rendimientoMax, valor, equivalenciaGalones } = args;
  if (rendimientoMin === null || rendimientoMax === null || equivalenciaGalones === null) return null;
  const galones = valor * equivalenciaGalones;
  const redondear = (n: number): number => Math.round(n * 100) / 100;
  const min = redondear(rendimientoMin * galones);
  const max = redondear(rendimientoMax * galones);
  return min > 0 && max > 0 ? { min, max, aproximado: true } : null;
}

export class ConsultaPublicaRepository implements ConsultaPublicaRepositoryPort {
  async categorias(): Promise<CategoriaPublica[]> {
    const grupos = await prisma.producto.groupBy({
      by: ['idSubcategoria'],
      where: visible(),
      _count: { _all: true },
    });
    if (grupos.length === 0) return [];
    const totales = new Map(grupos.map((g) => [g.idSubcategoria, g._count._all]));
    const filas = await prisma.categoria.findMany({
      where: { estado: 'activo', subcategorias: { some: { idSubcategoria: { in: [...totales.keys()] } } } },
      include: {
        subcategorias: {
          where: { estado: 'activo', idSubcategoria: { in: [...totales.keys()] } },
          orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
        },
      },
      orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
    });
    return filas.map((c) => ({
      idCategoria: c.idCategoria,
      nombre: c.nombre,
      subcategorias: c.subcategorias.map((s) => ({
        idSubcategoria: s.idSubcategoria,
        nombre: s.nombre,
        totalProductos: totales.get(s.idSubcategoria) ?? 0,
      })),
    }));
  }

  async filtros(): Promise<FiltrosPublicos> {
    const donde = visible();
    const [marcas, superficies, interior, exterior] = await Promise.all([
      prisma.marca.findMany({
        where: { estado: 'activo', productos: { some: donde } },
        select: { idMarca: true, nombre: true },
        orderBy: { nombre: 'asc' },
      }),
      prisma.superficie.findMany({
        where: { estado: 'activo', productos: { some: { producto: donde } } },
        select: { idSuperficie: true, nombre: true },
        orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
      }),
      prisma.producto.count({ where: visible({ usoInterior: true }) }),
      prisma.producto.count({ where: visible({ usoExterior: true }) }),
    ]);
    return {
      marcas: marcas.map((m) => ({ id: m.idMarca, nombre: m.nombre })),
      superficies: superficies.map((s) => ({ id: s.idSuperficie, nombre: s.nombre })),
      ambientes: [...(interior > 0 ? (['interior'] as const) : []), ...(exterior > 0 ? (['exterior'] as const) : [])],
    };
  }

  async listar(query: ListarProductosPublicosRequest): Promise<Pagina<ProductoPublicoTarjeta>> {
    const busqueda = query.busqueda;
    const filtros: Prisma.ProductoWhereInput = {
      ...(query.idMarca !== undefined ? { idMarca: query.idMarca } : {}),
      ...(query.idLinea !== undefined ? { idLinea: query.idLinea } : {}),
      ...(query.idSubcategoria !== undefined ? { idSubcategoria: query.idSubcategoria } : {}),
      ...(query.idCategoria !== undefined ? { subcategoria: { idCategoria: query.idCategoria } } : {}),
      ...(query.idSuperficie !== undefined ? { superficies: { some: { idSuperficie: query.idSuperficie } } } : {}),
      ...(query.ambiente === 'interior' ? { usoInterior: true } : {}),
      ...(query.ambiente === 'exterior' ? { usoExterior: true } : {}),
      ...(busqueda !== undefined && busqueda !== ''
        ? { OR: [{ nombre: contiene(busqueda) }, { marca: { nombre: contiene(busqueda) } }] }
        : {}),
    };
    const where = visible(filtros);
    const desplazamiento = { skip: (query.pagina - 1) * query.limite, take: query.limite };

    const total = await prisma.producto.count({ where });
    let idsPagina: number[];
    if (query.ordenar === 'nombre') {
      const filas = await prisma.producto.findMany({
        where,
        select: { idProducto: true },
        orderBy: [{ nombre: 'asc' }, { idProducto: 'asc' }],
        ...desplazamiento,
      });
      idsPagina = filas.map((f) => f.idProducto);
    } else {
      // Orden por precio: se ordena por el mínimo de las variantes activas.
      const grupos = await prisma.variante.groupBy({
        by: ['idProducto'],
        where: { estado: 'activo', producto: where },
        _min: { precioVigente: true },
        orderBy: [{ _min: { precioVigente: query.ordenar === 'precio_asc' ? 'asc' : 'desc' } }, { idProducto: 'asc' }],
        ...desplazamiento,
      });
      idsPagina = grupos.map((g) => g.idProducto);
    }
    if (idsPagina.length === 0) return { items: [], total };

    const [productos, variantes, imagenes] = await Promise.all([
      prisma.producto.findMany({
        where: { idProducto: { in: idsPagina } },
        select: {
          idProducto: true,
          nombre: true,
          marca: { select: { nombre: true } },
          linea: { select: { nombre: true } },
          subcategoria: { select: { nombre: true, categoria: { select: { nombre: true } } } },
          _count: { select: { bases: true, coloresFabrica: true } },
        },
      }),
      prisma.variante.findMany({
        where: { idProducto: { in: idsPagina }, estado: 'activo' },
        select: { idProducto: true, precioVigente: true, existenciaReferencial: true },
      }),
      prisma.imagen.findMany({
        where: { idProducto: { in: idsPagina } },
        select: { idImagen: true, idProducto: true, esPrincipal: true },
        orderBy: ORDEN_GALERIA,
      }),
    ]);
    const porId = new Map(productos.map((p) => [p.idProducto, p]));
    const items: ProductoPublicoTarjeta[] = idsPagina.flatMap((id) => {
      const p = porId.get(id);
      if (p === undefined) return [];
      const suyas = variantes.filter((v) => v.idProducto === id);
      const precios = suyas.map((v) => v.precioVigente.toNumber());
      return [
        {
          idProducto: p.idProducto,
          nombre: p.nombre,
          marca: p.marca.nombre,
          linea: p.linea?.nombre ?? null,
          categoria: p.subcategoria.categoria.nombre,
          subcategoria: p.subcategoria.nombre,
          precioDesde: precios.length === 0 ? null : Math.min(...precios),
          tieneColor: derivarClaseColor(p._count.bases, p._count.coloresFabrica) !== 'sin_color',
          disponibilidad: disponibilidad(suyas.map((v) => v.existenciaReferencial)),
          idImagenPrincipal: portada(imagenes.filter((i) => i.idProducto === id)),
        },
      ];
    });
    return { items, total };
  }

  async ficha(idProducto: number): Promise<ProductoPublicoFicha | null> {
    const p = await prisma.producto.findFirst({
      where: visible({ idProducto }),
      include: {
        marca: { select: { nombre: true } },
        linea: { select: { nombre: true } },
        subcategoria: { select: { nombre: true, categoria: { select: { nombre: true } } } },
        ficha: { include: { tipoResina: { select: { nombre: true } } } },
        superficies: { include: { superficie: true }, where: { superficie: { estado: 'activo' } } },
        acabados: { include: { acabado: true }, where: { acabado: { estado: 'activo' } } },
        caracteristicas: { orderBy: [{ orden: 'asc' }, { idCaracteristica: 'asc' }] },
        imagenes: { select: { idImagen: true, esPrincipal: true }, orderBy: ORDEN_GALERIA },
        variantes: {
          where: { estado: 'activo' },
          include: {
            medida: {
              select: {
                nombre: true,
                valor: true,
                imagenMimeType: true,
                tipoMedida: { select: { nombre: true, equivalenciaGalones: true } },
              },
            },
          },
        },
        _count: { select: { bases: true, coloresFabrica: true } },
      },
    });
    if (p === null) return null;

    const rendimientoMin = p.ficha?.rendimientoMin?.toNumber() ?? null;
    const rendimientoMax = p.ficha?.rendimientoMax?.toNumber() ?? null;
    const variantes: VariantePublica[] = p.variantes
      .map((v) => ({
        idVariante: v.idVariante,
        idMedida: v.idMedida,
        medida: v.medida.nombre,
        tipoMedida: v.medida.tipoMedida.nombre,
        sku: v.sku,
        precio: v.precioVigente.toNumber(),
        disponibilidad: disponibilidad([v.existenciaReferencial]),
        rendimiento: rendimientoDeMedida({
          rendimientoMin,
          rendimientoMax,
          valor: v.medida.valor.toNumber(),
          equivalenciaGalones: v.medida.tipoMedida.equivalenciaGalones?.toNumber() ?? null,
        }),
        tieneImagenMedida: v.medida.imagenMimeType !== null,
        orden: v.medida.valor.toNumber() * (v.medida.tipoMedida.equivalenciaGalones?.toNumber() ?? 1),
      }))
      .sort((a, b) => a.orden - b.orden || a.idVariante - b.idVariante)
      .map(({ orden: _orden, ...publica }) => publica);

    return {
      idProducto: p.idProducto,
      nombre: p.nombre,
      descripcion: p.descripcion,
      marca: p.marca.nombre,
      linea: p.linea?.nombre ?? null,
      categoria: p.subcategoria.categoria.nombre,
      subcategoria: p.subcategoria.nombre,
      usoInterior: p.usoInterior,
      usoExterior: p.usoExterior,
      claseColor: derivarClaseColor(p._count.bases, p._count.coloresFabrica),
      tipoResina: p.ficha?.tipoResina.nombre ?? null,
      tipoCalidad: p.ficha?.tipoCalidad == null ? null : (p.ficha.tipoCalidad as 1 | 2 | 3),
      manos: p.ficha?.manos ?? null,
      superficies: p.superficies
        .map((s) => s.superficie)
        .sort((a, b) => a.orden - b.orden)
        .map((s) => s.nombre),
      acabados: p.acabados
        .map((a) => a.acabado)
        .sort((a, b) => a.orden - b.orden)
        .map((a) => ({ id: a.idAcabado, nombre: a.nombre })),
      caracteristicas: p.caracteristicas.map((c) => ({ nombre: c.nombre, valor: c.valor, orden: c.orden })),
      variantes,
      imagenes: [...p.imagenes.filter((i) => i.esPrincipal), ...p.imagenes.filter((i) => !i.esPrincipal)].map((i) => ({
        idImagen: i.idImagen,
      })),
    };
  }

  /** U1: solo sirve imágenes de productos visibles. */
  async imagen(idImagen: number): Promise<ImagenBytes | null> {
    const f = await prisma.imagen.findFirst({
      where: { idImagen, producto: visible() },
      select: { datos: true, mimeType: true },
    });
    return f === null ? null : { bytes: Buffer.from(f.datos), mimeType: f.mimeType as ImagenBytes['mimeType'] };
  }

  /** La imagen de una medida se sirve si alguna variante activa de un producto visible la usa. */
  async imagenMedida(idMedida: number): Promise<ImagenBytes | null> {
    const f = await prisma.medida.findFirst({
      where: { idMedida, imagen: { not: null }, variantes: { some: { estado: 'activo', producto: visible() } } },
      select: { imagen: true, imagenMimeType: true },
    });
    if (f === null || f.imagen === null || f.imagenMimeType === null) return null;
    return { bytes: Buffer.from(f.imagen), mimeType: f.imagenMimeType as ImagenBytes['mimeType'] };
  }

  async colores(idProducto: number, query: ListarColoresProductoRequest): Promise<ColoresDeProducto | null> {
    const existe = await prisma.producto.count({ where: visible({ idProducto }) });
    if (existe === 0) return null;
    return consultarColoresOfrecidos(idProducto, query);
  }

  async logotipo(idMarca: number): Promise<LogotipoMarca | null> {
    const f = await prisma.marca.findFirst({
      where: { idMarca, estado: 'activo' },
      select: { logotipo: true, logotipoMimeType: true },
    });
    if (f === null) return null;
    return { bytes: Buffer.from(f.logotipo), mimeType: f.logotipoMimeType as LogotipoMarca['mimeType'] };
  }
}
