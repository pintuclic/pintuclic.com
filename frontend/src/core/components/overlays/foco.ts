/**
 * Utilidades de gestión de foco para superficies modales del Core Kit.
 *
 * La lógica de recorrido se mantiene aquí, pura y sin dependencias del DOM, para
 * que la trampa de foco sea verificable por pruebas unitarias (WCAG 2.2 — 2.1.2
 * «Sin trampas para el foco del teclado» y 2.4.3 «Orden del foco»).
 */

/** Selector de los elementos que pueden recibir foco dentro de un contenedor. */
export const SELECTOR_FOCALIZABLES = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Calcula el índice al que debe moverse el foco dentro de una superficie cerrada.
 *
 * @param total Cantidad de elementos focalizables del contenedor.
 * @param indiceActual Índice del elemento con foco, o `-1` si el foco está fuera.
 * @param haciaAtras `true` cuando el usuario pulsa `Shift+Tab`.
 * @returns Índice destino, o `-1` cuando no hay nada que enfocar.
 */
export function siguienteIndiceDeFoco(
  total: number,
  indiceActual: number,
  haciaAtras: boolean
): number {
  if (total <= 0) return -1;

  // Foco fuera del contenedor: entra por el extremo que corresponda al sentido.
  if (indiceActual < 0) return haciaAtras ? total - 1 : 0;

  if (haciaAtras) {
    return indiceActual === 0 ? total - 1 : indiceActual - 1;
  }

  return indiceActual === total - 1 ? 0 : indiceActual + 1;
}
