import { prisma } from '../../../core/db/client';
import type { Exclusion } from '../dtos/m06-precios.dto';
import {
  claveReferencia,
  type CatalogoPreciosRepositoryPort,
  type FilaCandidata,
  type FilaClasificacion,
} from '../interfaces/precios.interface';

const SELECCION_CLASIFICACION = {
  idVariante: true,
  idProducto: true,
  producto: {
    select: {
      idMarca: true,
      idLinea: true,
      idSubcategoria: true,
      excluidoDeDescuentos: true,
      subcategoria: { select: { idCategoria: true } },
    },
  },
} as const;

interface FilaVarianteClasificada {
  idVariante: number;
  idProducto: number;
  producto: {
    idMarca: number;
    idLinea: number | null;
    idSubcategoria: number;
    excluidoDeDescuentos: boolean;
    subcategoria: { idCategoria: number };
  };
}

function aClasificacion(v: FilaVarianteClasificada): FilaClasificacion {
  return {
    idVariante: v.idVariante,
    idProducto: v.idProducto,
    idMarca: v.producto.idMarca,
    idLinea: v.producto.idLinea,
    idSubcategoria: v.producto.idSubcategoria,
    idCategoria: v.producto.subcategoria.idCategoria,
    excluidoDeDescuentos: v.producto.excluidoDeDescuentos,
  };
}

/** Lectura del catálogo para decidir a qué evento pertenece cada línea (D7). No escribe nada. */
export class CatalogoPreciosRepository implements CatalogoPreciosRepositoryPort {
  async clasificar(idsVariante: readonly number[]): Promise<Map<number, FilaClasificacion>> {
    if (idsVariante.length === 0) return new Map();
    const filas = await prisma.variante.findMany({
      where: { idVariante: { in: [...idsVariante] } },
      select: SELECCION_CLASIFICACION,
    });
    return new Map(filas.map((f) => [f.idVariante, aClasificacion(f)]));
  }

  async familiasDeColores(idsColor: readonly number[]): Promise<Map<number, number | null>> {
    if (idsColor.length === 0) return new Map();
    const filas = await prisma.color.findMany({
      where: { idColor: { in: [...idsColor] } },
      select: { idColor: true, idFamiliaColor: true },
    });
    return new Map(filas.map((f) => [f.idColor, f.idFamiliaColor]));
  }

  async variantesActivasDeProductos(idsProducto: readonly number[]): Promise<FilaClasificacion[]> {
    if (idsProducto.length === 0) return [];
    const filas = await prisma.variante.findMany({
      where: { idProducto: { in: [...idsProducto] }, estado: 'activo', producto: { estado: 'activo' } },
      select: SELECCION_CLASIFICACION,
      orderBy: { idVariante: 'asc' },
    });
    return filas.map(aClasificacion);
  }

  async variantesActivasDelCatalogo(): Promise<FilaCandidata[]> {
    const filas = await prisma.variante.findMany({
      where: { estado: 'activo', producto: { estado: 'activo' } },
      select: {
        ...SELECCION_CLASIFICACION,
        producto: {
          select: {
            ...SELECCION_CLASIFICACION.producto.select,
            nombre: true,
            marca: { select: { nombre: true } },
            linea: { select: { nombre: true } },
          },
        },
      },
      orderBy: { idVariante: 'asc' },
    });
    return filas.map((f) => ({
      ...aClasificacion(f),
      nombreProducto: f.producto.nombre,
      marca: f.producto.marca.nombre,
      linea: f.producto.linea?.nombre ?? null,
    }));
  }

  async nombrar(refs: readonly Exclusion[]): Promise<{ nombres: Map<string, string>; inexistentes: Exclusion[] }> {
    const ids = (tipo: Exclusion['tipo']): number[] => [
      ...new Set(refs.filter((r) => r.tipo === tipo).map((r) => r.id)),
    ];
    const nombres = new Map<string, string>();
    const poner = (tipo: Exclusion['tipo'], id: number, nombre: string): void => {
      nombres.set(claveReferencia({ tipo, id }), nombre);
    };

    const [marcas, lineas, categorias, subcategorias, productos, variantes, colores, familias] = await Promise.all([
      prisma.marca.findMany({ where: { idMarca: { in: ids('marca') } }, select: { idMarca: true, nombre: true } }),
      prisma.linea.findMany({
        where: { idLinea: { in: ids('linea') } },
        select: { idLinea: true, nombre: true, marca: { select: { nombre: true } } },
      }),
      prisma.categoria.findMany({
        where: { idCategoria: { in: ids('categoria') } },
        select: { idCategoria: true, nombre: true },
      }),
      prisma.subcategoria.findMany({
        where: { idSubcategoria: { in: ids('subcategoria') } },
        select: { idSubcategoria: true, nombre: true },
      }),
      prisma.producto.findMany({
        where: { idProducto: { in: ids('producto') } },
        select: { idProducto: true, nombre: true, marca: { select: { nombre: true } } },
      }),
      prisma.variante.findMany({
        where: { idVariante: { in: ids('variante') } },
        select: {
          idVariante: true,
          sku: true,
          medida: { select: { nombre: true } },
          producto: { select: { nombre: true } },
        },
      }),
      prisma.color.findMany({
        where: { idColor: { in: ids('color') } },
        select: { idColor: true, nombre: true, codigo: true },
      }),
      prisma.familiaColor.findMany({
        where: { idFamiliaColor: { in: ids('familia_color') } },
        select: { idFamiliaColor: true, nombre: true },
      }),
    ]);

    marcas.forEach((m) => poner('marca', m.idMarca, m.nombre));
    lineas.forEach((l) => poner('linea', l.idLinea, `${l.marca.nombre} · ${l.nombre}`));
    categorias.forEach((c) => poner('categoria', c.idCategoria, c.nombre));
    subcategorias.forEach((s) => poner('subcategoria', s.idSubcategoria, s.nombre));
    productos.forEach((p) => poner('producto', p.idProducto, `${p.marca.nombre} · ${p.nombre}`));
    variantes.forEach((v) => poner('variante', v.idVariante, `${v.producto.nombre} · ${v.medida.nombre} (${v.sku})`));
    colores.forEach((c) => poner('color', c.idColor, c.codigo === null ? c.nombre : `${c.nombre} (${c.codigo})`));
    familias.forEach((f) => poner('familia_color', f.idFamiliaColor, f.nombre));

    const unicas = new Map(refs.map((r) => [claveReferencia(r), r]));
    return { nombres, inexistentes: [...unicas.values()].filter((r) => !nombres.has(claveReferencia(r))) };
  }
}
