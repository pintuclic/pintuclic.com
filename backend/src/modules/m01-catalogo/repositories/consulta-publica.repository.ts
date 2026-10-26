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
import type { DerivadaGuardada, ImagenesRepositoryPort, TamanoDerivado } from '../interfaces/imagenes.interface';
import { ImagenesRepository, ORDEN_GALERIA } from './imagenes.repository';
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

/** Tope de candidatos que se traen (solo ids) antes de sortear los complementarios. */
const CANDIDATOS_MAXIMOS = 500;

/** Fisher–Yates; `aleatorio` se inyecta para poder probarlo con valores fijos. */
export function barajar<T>(lista: readonly T[], aleatorio: () => number): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(aleatorio() * (i + 1));
    const actual = copia[i];
    const otro = copia[j];
    if (actual !== undefined && otro !== undefined) {
      copia[i] = otro;
      copia[j] = actual;
    }
  }
  return copia;
}

export class ConsultaPublicaRepository implements ConsultaPublicaRepositoryPort {
  constructor(private readonly imagenes: ImagenesRepositoryPort = new ImagenesRepository()) {}

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

  async listar(
    query: ListarProductosPublicosRequest,
    idsPermitidos?: readonly number[],
  ): Promise<Pagina<ProductoPublicoTarjeta>> {
    const busqueda = query.busqueda;
    const filtros: Prisma.ProductoWhereInput = {
      ...(idsPermitidos !== undefined ? { idProducto: { in: [...idsPermitidos] } } : {}),
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
    return { items: await this.tarjetas(idsPagina), total };
  }

  /** Tarjetas de los productos pedidos, en el mismo orden (los que ya no son visibles se omiten). */
  private async tarjetas(ids: readonly number[]): Promise<ProductoPublicoTarjeta[]> {
    if (ids.length === 0) return [];
    const [productos, variantes, imagenes] = await Promise.all([
      prisma.producto.findMany({
        where: { idProducto: { in: [...ids] } },
        select: {
          idProducto: true,
          nombre: true,
          esCombo: true,
          marca: { select: { nombre: true } },
          linea: { select: { nombre: true } },
          subcategoria: { select: { nombre: true, categoria: { select: { nombre: true } } } },
          _count: { select: { bases: true, coloresFabrica: true } },
        },
      }),
      prisma.variante.findMany({
        where: { idProducto: { in: [...ids] }, estado: 'activo' },
        select: { idProducto: true, precioVigente: true, existenciaReferencial: true },
      }),
      prisma.imagen.findMany({
        where: { idProducto: { in: [...ids] } },
        select: { idImagen: true, idProducto: true, esPrincipal: true },
        orderBy: ORDEN_GALERIA,
      }),
    ]);
    const porId = new Map(productos.map((p) => [p.idProducto, p]));
    return ids.flatMap((id) => {
      const p = porId.get(id);
      if (p === undefined) return [];
      const suyas = variantes.filter((v) => v.idProducto === id);
      const precios = suyas.map((v) => v.precioVigente.toNumber());
      const disponible = disponibilidad(suyas.map((v) => v.existenciaReferencial));
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
          disponibilidad: disponible,
          idImagenPrincipal: portada(imagenes.filter((i) => i.idProducto === id)),
          esCombo: p.esCombo,
          // K5: un combo agotado se ve pero no se compra; el resto de productos siempre se puede comprar.
          compraBloqueada: p.esCombo && disponible === 'agotado',
          // La oferta la agrega el servicio con lo que dice M06.
          oferta: null,
        },
      ];
    });
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
        imagenes: {
          select: { idImagen: true, esPrincipal: true, idVariante: true, idColor: true },
          orderBy: ORDEN_GALERIA,
        },
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
        compraBloqueada: p.esCombo && v.existenciaReferencial === 0,
        oferta: null,
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
      esCombo: p.esCombo,
      compraBloqueada: p.esCombo && variantes.every((v) => v.compraBloqueada),
      imagenes: [...p.imagenes.filter((i) => i.esPrincipal), ...p.imagenes.filter((i) => !i.esPrincipal)].map((i) => ({
        idImagen: i.idImagen,
        idVariante: i.idVariante,
        idColor: i.idColor,
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

  /** Versión reducida de una imagen visible (I7); `derivada` es null en imágenes anteriores a la entrega 3. */
  async imagenDerivada(idImagen: number, tamano: TamanoDerivado): Promise<DerivadaGuardada | null> {
    const visibleLa = await prisma.imagen.count({ where: { idImagen, producto: visible() } });
    if (visibleLa === 0) return null;
    return this.imagenes.obtenerDerivada(idImagen, tamano);
  }

  guardarDerivada(idImagen: number, tamano: TamanoDerivado, bytes: Buffer): Promise<void> {
    return this.imagenes.guardarDerivada(idImagen, tamano, bytes);
  }

  /**
   * X1–X4: hasta `limite` productos para la ficha de `idProducto`. null si ese producto no es visible (U1).
   * Con categoría complementaria: patrocinados primero y luego el resto, cada grupo al azar. Sin ella:
   * solo patrocinados. Se excluyen el propio producto, los no visibles y los combos agotados.
   */
  async complementarios(
    idProducto: number,
    limite: number,
    aleatorio: () => number = Math.random,
  ): Promise<ProductoPublicoTarjeta[] | null> {
    const origen = await prisma.producto.findFirst({
      where: visible({ idProducto }),
      select: { idCategoriaComplementaria: true, subcategoria: { select: { idCategoriaComplementaria: true } } },
    });
    if (origen === null) return null;
    const idCategoria = origen.idCategoriaComplementaria ?? origen.subcategoria.idCategoriaComplementaria;

    const vendiblesAhora: Prisma.ProductoWhereInput = {
      idProducto: { not: idProducto },
      // Un combo sin ninguna unidad no se sugiere (RF-CAT-13-04).
      NOT: { esCombo: true, variantes: { none: { estado: 'activo', existenciaReferencial: { gt: 0 } } } },
    };
    const ids = async (extra: Prisma.ProductoWhereInput): Promise<number[]> =>
      (
        await prisma.producto.findMany({
          where: visible({ AND: [vendiblesAhora, extra] }),
          select: { idProducto: true },
          take: CANDIDATOS_MAXIMOS,
        })
      ).map((f) => f.idProducto);

    const elegidos: number[] = [];
    const patrocinados = barajar(
      await ids(idCategoria === null ? { patrocinado: true } : { patrocinado: true, subcategoria: { idCategoria } }),
      aleatorio,
    );
    elegidos.push(...patrocinados.slice(0, limite));
    if (idCategoria !== null && elegidos.length < limite) {
      const resto = barajar(await ids({ patrocinado: false, subcategoria: { idCategoria } }), aleatorio);
      elegidos.push(...resto.slice(0, limite - elegidos.length));
    }
    return this.tarjetas(elegidos);
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
