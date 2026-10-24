import type { Prisma } from '@prisma/client';
import { prisma } from '../../../core/db/client';
import type { Estado, ImpactoDesactivacion } from '../dtos/m01-catalogo.dto';
import type {
  ClaseColor,
  ColorOfrecido,
  FamiliaDisponible,
  ListarColoresProductoRequest,
  ListarProductosRequest,
  ProductoDetalle,
  ProductoResumen,
  Variante,
} from '../dtos/m01-catalogo-productos.dto';
import type { Pagina } from '../interfaces/catalogo.interface';
import type {
  CampoRelacion,
  ClaveProducto,
  ColoresDeProducto,
  CrearProductoDatos,
  EditarProductoDatos,
  FichaRecubrimientoDatos,
  ProductosRepositoryPort,
  RelacionesAVerificar,
} from '../interfaces/productos.interface';
import { impactoVacio } from './prisma-comun';

const igualSinMayusculas = (texto: string): Prisma.StringFilter => ({
  equals: texto,
  mode: 'insensitive',
});
const contiene = (texto: string): Prisma.StringFilter => ({
  contains: texto,
  mode: 'insensitive',
});

const SELECCION_RESUMEN = {
  idProducto: true,
  nombre: true,
  idMarca: true,
  idLinea: true,
  idSubcategoria: true,
  usoInterior: true,
  usoExterior: true,
  estado: true,
  publicado: true,
  patrocinado: true,
  marca: { select: { nombre: true } },
  linea: { select: { nombre: true } },
  subcategoria: {
    select: { nombre: true, categoria: { select: { nombre: true } } },
  },
  _count: { select: { bases: true, coloresFabrica: true } },
} satisfies Prisma.ProductoSelect;

const INCLUIR_DETALLE = {
  marca: { select: { nombre: true } },
  linea: { select: { nombre: true } },
  subcategoria: {
    select: { nombre: true, categoria: { select: { nombre: true } } },
  },
  ficha: { include: { tipoResina: { select: { nombre: true } } } },
  superficies: {
    include: { superficie: { select: { nombre: true, orden: true } } },
  },
  acabados: { include: { acabado: { select: { nombre: true, orden: true } } } },
  bases: { include: { base: { select: { nombre: true, orden: true } } } },
  coloresFabrica: { include: { color: { select: { nombre: true } } } },
  caracteristicas: { orderBy: [{ orden: 'asc' }, { idCaracteristica: 'asc' }] },
  variantes: {
    include: {
      medida: {
        select: { nombre: true, tipoMedida: { select: { nombre: true } } },
      },
    },
    orderBy: { idVariante: 'asc' },
  },
} satisfies Prisma.ProductoInclude;

type FilaDetalle = Prisma.ProductoGetPayload<{
  include: typeof INCLUIR_DETALLE;
}>;
type FilaResumen = Prisma.ProductoGetPayload<{
  select: typeof SELECCION_RESUMEN;
}>;

/** P4: la clase se deriva de lo que tiene el producto; nunca se guarda. */
export function derivarClaseColor(bases: number, coloresFabrica: number): ClaseColor {
  if (bases > 0) return 'entonable';
  return coloresFabrica > 0 ? 'colores_fijos' : 'sin_color';
}

/** Las variantes solo usan activo/inactivo (D12). */
export function estadoDeVariante(estado: string): Estado {
  return estado === 'activo' ? 'activo' : 'inactivo';
}

export function aVariante(f: {
  idVariante: number;
  idProducto: number;
  idMedida: number;
  sku: string;
  precioVigente: Prisma.Decimal;
  existenciaReferencial: number;
  codigoProveedor: string | null;
  estado: string;
  medida: { nombre: string; tipoMedida: { nombre: string } };
}): Variante {
  return {
    idVariante: f.idVariante,
    idProducto: f.idProducto,
    idMedida: f.idMedida,
    medida: f.medida.nombre,
    tipoMedida: f.medida.tipoMedida.nombre,
    sku: f.sku,
    precio: f.precioVigente.toNumber(),
    existenciaReferencial: f.existenciaReferencial,
    codigoProveedor: f.codigoProveedor,
    estado: estadoDeVariante(f.estado),
  };
}

function aResumen(f: FilaResumen, variantesActivas: number): ProductoResumen {
  return {
    idProducto: f.idProducto,
    nombre: f.nombre,
    idMarca: f.idMarca,
    marca: f.marca.nombre,
    idLinea: f.idLinea,
    linea: f.linea?.nombre ?? null,
    idSubcategoria: f.idSubcategoria,
    subcategoria: f.subcategoria.nombre,
    categoria: f.subcategoria.categoria.nombre,
    usoInterior: f.usoInterior,
    usoExterior: f.usoExterior,
    claseColor: derivarClaseColor(f._count.bases, f._count.coloresFabrica),
    estado: f.estado,
    publicado: f.publicado,
    patrocinado: f.patrocinado,
    variantesActivas,
  };
}

function aDetalle(f: FilaDetalle): ProductoDetalle {
  const variantes = f.variantes.map(aVariante);
  const referencias = <T extends { orden: number }>(
    filas: Array<{ id: number; nombre: string; orden: number } & T>,
  ): Array<{ id: number; nombre: string }> =>
    [...filas]
      .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre))
      .map((r) => ({ id: r.id, nombre: r.nombre }));
  return {
    idProducto: f.idProducto,
    nombre: f.nombre,
    idMarca: f.idMarca,
    marca: f.marca.nombre,
    idLinea: f.idLinea,
    linea: f.linea?.nombre ?? null,
    idSubcategoria: f.idSubcategoria,
    subcategoria: f.subcategoria.nombre,
    categoria: f.subcategoria.categoria.nombre,
    usoInterior: f.usoInterior,
    usoExterior: f.usoExterior,
    claseColor: derivarClaseColor(f.bases.length, f.coloresFabrica.length),
    estado: f.estado,
    publicado: f.publicado,
    patrocinado: f.patrocinado,
    variantesActivas: variantes.filter((v) => v.estado === 'activo').length,
    descripcion: f.descripcion,
    idCategoriaComplementaria: f.idCategoriaComplementaria,
    ficha:
      f.ficha === null
        ? null
        : {
            idTipoResina: f.ficha.idTipoResina,
            tipoResina: f.ficha.tipoResina.nombre,
            tipoCalidad: f.ficha.tipoCalidad === null ? null : (f.ficha.tipoCalidad as 1 | 2 | 3),
            rendimientoMin: f.ficha.rendimientoMin?.toNumber() ?? null,
            rendimientoMax: f.ficha.rendimientoMax?.toNumber() ?? null,
          },
    superficies: referencias(
      f.superficies.map((r) => ({
        id: r.idSuperficie,
        nombre: r.superficie.nombre,
        orden: r.superficie.orden,
      })),
    ),
    acabados: referencias(
      f.acabados.map((r) => ({
        id: r.idAcabado,
        nombre: r.acabado.nombre,
        orden: r.acabado.orden,
      })),
    ),
    bases: referencias(
      f.bases.map((r) => ({
        id: r.idBase,
        nombre: r.base.nombre,
        orden: r.base.orden,
      })),
    ),
    coloresFabrica: referencias(
      f.coloresFabrica.map((r) => ({
        id: r.idColor,
        nombre: r.color.nombre,
        orden: 0,
      })),
    ),
    caracteristicas: f.caracteristicas.map((c) => ({
      nombre: c.nombre,
      valor: c.valor,
      orden: c.orden,
    })),
    variantes,
  };
}

function columnasFicha(f: FichaRecubrimientoDatos): {
  idTipoResina: number;
  tipoCalidad: number | null;
  rendimientoMin: number | null;
  rendimientoMax: number | null;
} {
  return {
    idTipoResina: f.idTipoResina,
    tipoCalidad: f.tipoCalidad,
    rendimientoMin: f.rendimientoMin,
    rendimientoMax: f.rendimientoMax,
  };
}

/**
 * P5: colores que ofrece un producto = colores activos de su marca cuya base está entre sus
 * bases (y activa) y cuyo acabado está entre sus acabados (y activo), más sus colores de fábrica.
 * Se comparte con la consulta pública.
 */
export function filtroColoresOfrecidos(idProducto: number, idMarca: number): Prisma.ColorWhereInput {
  return {
    idMarca,
    estado: 'activo',
    OR: [
      { productos: { some: { idProducto } } },
      {
        base: { estado: 'activo', productos: { some: { idProducto } } },
        acabado: { estado: 'activo', productos: { some: { idProducto } } },
      },
    ],
  };
}

export async function consultarColoresOfrecidos(
  idProducto: number,
  query: ListarColoresProductoRequest,
): Promise<ColoresDeProducto | null> {
  const producto = await prisma.producto.findUnique({
    where: { idProducto },
    select: { idMarca: true },
  });
  if (producto === null) return null;

  const base = filtroColoresOfrecidos(idProducto, producto.idMarca);
  const busqueda = query.busqueda;
  const filtros: Prisma.ColorWhereInput[] = [base];
  if (busqueda !== undefined && busqueda !== '') {
    filtros.push({
      OR: [{ nombre: contiene(busqueda) }, { codigo: contiene(busqueda) }],
    });
  }
  if (query.idAcabado !== undefined) filtros.push({ idAcabado: query.idAcabado });
  // Las familias se calculan sin el filtro de familia para que el selector no se vacíe al elegir una.
  const sinFamilia: Prisma.ColorWhereInput = { AND: filtros };
  const conFamilia: Prisma.ColorWhereInput =
    query.idFamiliaColor !== undefined ? { AND: [...filtros, { idFamiliaColor: query.idFamiliaColor }] } : sinFamilia;

  const [filas, total, grupos] = await Promise.all([
    prisma.color.findMany({
      where: conFamilia,
      include: {
        familia: { select: { nombre: true } },
        acabado: { select: { nombre: true } },
        productos: { where: { idProducto }, select: { idProducto: true } },
      },
      orderBy: [{ nombre: 'asc' }, { idColor: 'asc' }],
      skip: (query.pagina - 1) * query.limite,
      take: query.limite,
    }),
    prisma.color.count({ where: conFamilia }),
    prisma.color.groupBy({
      by: ['idFamiliaColor'],
      where: { AND: [sinFamilia, { idFamiliaColor: { not: null } }] },
      _count: { _all: true },
    }),
  ]);

  const idsFamilia = grupos.flatMap((g) => (g.idFamiliaColor === null ? [] : [g.idFamiliaColor]));
  const familiasBd = await prisma.familiaColor.findMany({
    where: { idFamiliaColor: { in: idsFamilia } },
    orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
  });
  const totales = new Map(grupos.map((g) => [g.idFamiliaColor, g._count._all]));
  const familias: FamiliaDisponible[] = familiasBd.map((f) => ({
    idFamiliaColor: f.idFamiliaColor,
    nombre: f.nombre,
    hexadecimal: f.hexadecimal,
    total: totales.get(f.idFamiliaColor) ?? 0,
  }));

  const items: ColorOfrecido[] = filas.map((c) => ({
    idColor: c.idColor,
    nombre: c.nombre,
    codigo: c.codigo,
    hexadecimal: c.hexadecimal,
    idFamiliaColor: c.idFamiliaColor,
    familia: c.familia?.nombre ?? null,
    idAcabado: c.idAcabado,
    acabado: c.acabado.nombre,
    esDeFabrica: c.productos.length > 0,
  }));
  return { items, total, familias };
}

export class ProductosRepository implements ProductosRepositoryPort {
  async listar(query: ListarProductosRequest): Promise<Pagina<ProductoResumen>> {
    const busqueda = query.busqueda;
    const clase: Prisma.ProductoWhereInput =
      query.claseColor === 'entonable'
        ? { bases: { some: {} } }
        : query.claseColor === 'colores_fijos'
          ? { bases: { none: {} }, coloresFabrica: { some: {} } }
          : query.claseColor === 'sin_color'
            ? { bases: { none: {} }, coloresFabrica: { none: {} } }
            : {};
    const where: Prisma.ProductoWhereInput = {
      ...clase,
      ...(query.idMarca !== undefined ? { idMarca: query.idMarca } : {}),
      ...(query.idLinea !== undefined ? { idLinea: query.idLinea } : {}),
      ...(query.idSubcategoria !== undefined ? { idSubcategoria: query.idSubcategoria } : {}),
      ...(query.estado !== undefined ? { estado: query.estado } : {}),
      ...(query.publicado !== undefined ? { publicado: query.publicado } : {}),
      ...(busqueda !== undefined && busqueda !== '' ? { nombre: contiene(busqueda) } : {}),
    };
    const [filas, total] = await Promise.all([
      prisma.producto.findMany({
        where,
        select: SELECCION_RESUMEN,
        orderBy: [{ nombre: 'asc' }, { idProducto: 'asc' }],
        skip: (query.pagina - 1) * query.limite,
        take: query.limite,
      }),
      prisma.producto.count({ where }),
    ]);
    const activas = await prisma.variante.groupBy({
      by: ['idProducto'],
      where: {
        idProducto: { in: filas.map((f) => f.idProducto) },
        estado: 'activo',
      },
      _count: { _all: true },
    });
    const porProducto = new Map(activas.map((a) => [a.idProducto, a._count._all]));
    return {
      items: filas.map((f) => aResumen(f, porProducto.get(f.idProducto) ?? 0)),
      total,
    };
  }

  async obtener(id: number): Promise<ProductoDetalle | null> {
    const f = await prisma.producto.findUnique({
      where: { idProducto: id },
      include: INCLUIR_DETALLE,
    });
    return f === null ? null : aDetalle(f);
  }

  async crear(datos: CrearProductoDatos): Promise<ProductoDetalle> {
    const creado = await prisma.producto.create({
      data: {
        idMarca: datos.idMarca,
        idLinea: datos.idLinea,
        idSubcategoria: datos.idSubcategoria,
        nombre: datos.nombre,
        descripcion: datos.descripcion,
        usoInterior: datos.usoInterior,
        usoExterior: datos.usoExterior,
        idCategoriaComplementaria: datos.idCategoriaComplementaria,
        patrocinado: datos.patrocinado,
        ...(datos.ficha !== null ? { ficha: { create: columnasFicha(datos.ficha) } } : {}),
        superficies: {
          create: datos.idsSuperficies.map((idSuperficie) => ({
            idSuperficie,
          })),
        },
        acabados: {
          create: datos.idsAcabados.map((idAcabado) => ({ idAcabado })),
        },
        bases: { create: datos.idsBases.map((idBase) => ({ idBase })) },
        coloresFabrica: {
          create: datos.idsColoresFabrica.map((idColor) => ({ idColor })),
        },
        caracteristicas: { create: datos.caracteristicas },
      },
      select: { idProducto: true },
    });
    return this.obtenerExistente(creado.idProducto);
  }

  async editar(id: number, datos: EditarProductoDatos): Promise<ProductoDetalle> {
    await prisma.$transaction(async (tx) => {
      await tx.producto.update({
        where: { idProducto: id },
        data: {
          ...(datos.idLinea !== undefined ? { idLinea: datos.idLinea } : {}),
          ...(datos.idSubcategoria !== undefined ? { idSubcategoria: datos.idSubcategoria } : {}),
          ...(datos.nombre !== undefined ? { nombre: datos.nombre } : {}),
          ...(datos.descripcion !== undefined ? { descripcion: datos.descripcion } : {}),
          ...(datos.usoInterior !== undefined ? { usoInterior: datos.usoInterior } : {}),
          ...(datos.usoExterior !== undefined ? { usoExterior: datos.usoExterior } : {}),
          ...(datos.idCategoriaComplementaria !== undefined
            ? { idCategoriaComplementaria: datos.idCategoriaComplementaria }
            : {}),
          ...(datos.patrocinado !== undefined ? { patrocinado: datos.patrocinado } : {}),
        },
      });
      if (datos.ficha === null) {
        await tx.fichaRecubrimiento.deleteMany({ where: { idProducto: id } });
      } else if (datos.ficha !== undefined) {
        const columnas = columnasFicha(datos.ficha);
        await tx.fichaRecubrimiento.upsert({
          where: { idProducto: id },
          create: { idProducto: id, ...columnas },
          update: columnas,
        });
      }
      if (datos.idsSuperficies !== undefined) {
        await tx.productoSuperficie.deleteMany({ where: { idProducto: id } });
        await tx.productoSuperficie.createMany({
          data: datos.idsSuperficies.map((idSuperficie) => ({
            idProducto: id,
            idSuperficie,
          })),
        });
      }
      if (datos.idsAcabados !== undefined) {
        await tx.productoAcabado.deleteMany({ where: { idProducto: id } });
        await tx.productoAcabado.createMany({
          data: datos.idsAcabados.map((idAcabado) => ({
            idProducto: id,
            idAcabado,
          })),
        });
      }
      if (datos.idsBases !== undefined) {
        await tx.productoBase.deleteMany({ where: { idProducto: id } });
        await tx.productoBase.createMany({
          data: datos.idsBases.map((idBase) => ({ idProducto: id, idBase })),
        });
      }
      if (datos.idsColoresFabrica !== undefined) {
        await tx.productoColor.deleteMany({ where: { idProducto: id } });
        await tx.productoColor.createMany({
          data: datos.idsColoresFabrica.map((idColor) => ({
            idProducto: id,
            idColor,
          })),
        });
      }
      if (datos.caracteristicas !== undefined) {
        await tx.productoCaracteristica.deleteMany({
          where: { idProducto: id },
        });
        await tx.productoCaracteristica.createMany({
          data: datos.caracteristicas.map((c) => ({
            idProducto: id,
            nombre: c.nombre,
            valor: c.valor,
            orden: c.orden,
          })),
        });
      }
    });
    return this.obtenerExistente(id);
  }

  async cambiarEstado(id: number, estado: Estado): Promise<ProductoDetalle> {
    await prisma.producto.update({
      where: { idProducto: id },
      data: { estado },
    });
    return this.obtenerExistente(id);
  }

  async cambiarPublicacion(id: number, publicado: boolean): Promise<ProductoDetalle> {
    await prisma.producto.update({
      where: { idProducto: id },
      data: { publicado },
    });
    return this.obtenerExistente(id);
  }

  /** P9: desactivar un producto afecta a sus variantes activas (dejan de venderse). */
  async contarImpacto(id: number): Promise<ImpactoDesactivacion> {
    const variantes = await this.contarVariantesActivas(id);
    return { ...impactoVacio(), variantes };
  }

  contarVariantesActivas(idProducto: number): Promise<number> {
    return prisma.variante.count({ where: { idProducto, estado: 'activo' } });
  }

  async existeDuplicado(clave: ClaveProducto, excluirId?: number): Promise<boolean> {
    const f = await prisma.producto.findFirst({
      where: {
        idMarca: clave.idMarca,
        nombre: igualSinMayusculas(clave.nombre),
        ...(excluirId !== undefined ? { NOT: { idProducto: excluirId } } : {}),
      },
      select: { idProducto: true },
    });
    return f !== null;
  }

  /** P10: marca, línea (si tiene), subcategoría y categoría activas. */
  async padreActivo(id: number): Promise<boolean> {
    const f = await prisma.producto.findUnique({
      where: { idProducto: id },
      select: {
        marca: { select: { estado: true } },
        linea: { select: { estado: true } },
        subcategoria: {
          select: { estado: true, categoria: { select: { estado: true } } },
        },
      },
    });
    if (f === null) return false;
    return (
      f.marca.estado === 'activo' &&
      (f.linea === null || f.linea.estado === 'activo') &&
      f.subcategoria.estado === 'activo' &&
      f.subcategoria.categoria.estado === 'activo'
    );
  }

  async verificarRelaciones(r: RelacionesAVerificar): Promise<CampoRelacion | null> {
    const todosActivos = async (
      ids: readonly number[],
      contar: (ids: number[]) => Promise<number>,
    ): Promise<boolean> => {
      const unicos = [...new Set(ids)];
      return unicos.length === 0 || (await contar(unicos)) === unicos.length;
    };
    if (r.idTipoResina !== undefined) {
      const n = await prisma.tipoResina.count({
        where: { idTipoResina: r.idTipoResina, estado: 'activo' },
      });
      if (n !== 1) return 'idTipoResina';
    }
    if (r.idCategoriaComplementaria !== undefined) {
      const n = await prisma.categoria.count({
        where: { idCategoria: r.idCategoriaComplementaria, estado: 'activo' },
      });
      if (n !== 1) return 'idCategoriaComplementaria';
    }
    if (
      r.idsSuperficies !== undefined &&
      !(await todosActivos(r.idsSuperficies, (ids) =>
        prisma.superficie.count({
          where: { idSuperficie: { in: ids }, estado: 'activo' },
        }),
      ))
    ) {
      return 'idsSuperficies';
    }
    if (
      r.idsAcabados !== undefined &&
      !(await todosActivos(r.idsAcabados, (ids) =>
        prisma.acabado.count({
          where: { idAcabado: { in: ids }, estado: 'activo' },
        }),
      ))
    ) {
      return 'idsAcabados';
    }
    if (
      r.idsBases !== undefined &&
      !(await todosActivos(r.idsBases, (ids) =>
        prisma.base.count({ where: { idBase: { in: ids }, estado: 'activo' } }),
      ))
    ) {
      return 'idsBases';
    }
    if (
      r.idsColoresFabrica !== undefined &&
      !(await todosActivos(r.idsColoresFabrica, (ids) =>
        prisma.color.count({
          where: { idColor: { in: ids }, idMarca: r.idMarca, estado: 'activo' },
        }),
      ))
    ) {
      return 'idsColoresFabrica';
    }
    return null;
  }

  listarColores(idProducto: number, query: ListarColoresProductoRequest): Promise<ColoresDeProducto> {
    return consultarColoresOfrecidos(idProducto, query).then((r) => r ?? { items: [], total: 0, familias: [] });
  }

  private async obtenerExistente(id: number): Promise<ProductoDetalle> {
    const f = await prisma.producto.findUniqueOrThrow({
      where: { idProducto: id },
      include: INCLUIR_DETALLE,
    });
    return aDetalle(f);
  }
}
