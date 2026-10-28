/** Punto de enfoque de una imagen: porcentajes enteros de 0 a 100 desde la izquierda (x) y desde arriba (y). */
export interface FocoImagen {
  x: number;
  y: number;
}

export const FOCO_CENTRO: FocoImagen = { x: 50, y: 50 };

/** Acota un valor a un porcentaje entero de 0 a 100 (lo que no es número queda en el centro). */
export function acotarPorcentaje(valor: number): number {
  if (!Number.isFinite(valor)) return 50;
  return Math.min(100, Math.max(0, Math.round(valor)));
}

/** El foco que corresponde a un punto (clientX/clientY) dentro de una caja; sirve para el clic y el arrastre sobre la imagen. */
export function focoDesdePunto(clienteX: number, clienteY: number, caja: { left: number; top: number; width: number; height: number }): FocoImagen {
  if (caja.width <= 0 || caja.height <= 0) return FOCO_CENTRO;
  return {
    x: acotarPorcentaje(((clienteX - caja.left) / caja.width) * 100),
    y: acotarPorcentaje(((clienteY - caja.top) / caja.height) * 100),
  };
}

/** El valor de `object-position` para pintar la imagen recortada alrededor de su punto de enfoque. */
export const posicionDeFoco = (foco: FocoImagen | null | undefined): string => {
  const f = foco ?? FOCO_CENTRO;
  return `${acotarPorcentaje(f.x)}% ${acotarPorcentaje(f.y)}%`;
};
