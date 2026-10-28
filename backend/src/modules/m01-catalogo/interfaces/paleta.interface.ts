import type { Lab } from '../services/color-matematica';

/** Un color activo de la carta, con todo lo que la paleta necesita (precalculado una vez por instantánea). */
export interface ColorCatalogo {
  idColor: number;
  nombre: string;
  codigo: string | null;
  hexadecimal: string;
  idMarca: number;
  marca: string;
  idFamiliaColor: number | null;
  familia: string | null;
  /** Para ordenar las familias como el administrador las dispuso; null si el color no tiene familia. */
  ordenFamilia: number | null;
  acabado: string;
  lab: Lab;
  /** Luminosidad HSL (0 a 100), para ordenar de más claro a más oscuro (P3). */
  luminosidad: number;
  /** Texto de búsqueda sin tildes ni mayúsculas: nombre y código. */
  textoBusqueda: string;
}

export interface FamiliaCatalogo {
  idFamiliaColor: number;
  nombre: string;
  hexadecimal: string;
  orden: number;
}

/**
 * Lo que la paleta sabe en un momento (P1, P13): los colores que algún producto visible entrega hoy y cuántos
 * productos los entregan. Se guarda en memoria unos segundos.
 */
export interface InstantaneaPaleta {
  /** Solo colores con al menos un producto, ya en el orden de P3. */
  colores: readonly ColorCatalogo[];
  productosPorColor: ReadonlyMap<number, number>;
  familias: readonly FamiliaCatalogo[];
}

export interface PaletaRepositoryPort {
  construir(): Promise<InstantaneaPaleta>;
}
