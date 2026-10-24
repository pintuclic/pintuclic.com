import type { Prisma } from '@prisma/client';

/**
 * Con `exactOptionalPropertyTypes` no se puede pasar `undefined` a un campo opcional
 * de Prisma: este auxiliar quita las claves sin valor antes de construir `data`.
 */
export function sinIndefinidos<T extends Record<string, unknown>>(
  objeto: T,
): { [K in keyof T]?: Exclude<T[K], undefined> } {
  const entradas = Object.entries(objeto).filter(([, valor]) => valor !== undefined);
  return Object.fromEntries(entradas) as { [K in keyof T]?: Exclude<T[K], undefined> };
}

/**
 * Producto visible en el catálogo público (R5 / U1): activo, publicado y con toda su
 * cadena activa (marca, línea si tiene, subcategoría y categoría).
 */
export function productoVisible(extra: Prisma.ProductoWhereInput = {}): Prisma.ProductoWhereInput {
  return {
    AND: [
      {
        estado: 'activo',
        publicado: true,
        marca: { estado: 'activo' },
        OR: [{ idLinea: null }, { linea: { estado: 'activo' } }],
        subcategoria: { estado: 'activo', categoria: { estado: 'activo' } },
      },
      extra,
    ],
  };
}

/** Impacto vacío: punto de partida de cada recurso (R6). */
export function impactoVacio(): {
  productos: number;
  subcategorias: number;
  lineas: number;
  colores: number;
  variantes: number;
  reglasComerciales: number;
} {
  return { productos: 0, subcategorias: 0, lineas: 0, colores: 0, variantes: 0, reglasComerciales: 0 };
}
