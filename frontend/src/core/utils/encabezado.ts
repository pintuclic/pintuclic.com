/** Cuántos píxeles hay que mover el scroll en un sentido para que la franja superior cambie (evita parpadeos por temblores). */
export const UMBRAL_SCROLL_PX = 8;

/**
 * Decide si la franja azul de información (Topbar) debe verse. Se esconde al BAJAR y reaparece al SUBIR; arriba de todo
 * siempre se ve. `y` es el scroll actual, `anterior` el de la medición pasada y `alturaFranja` lo que mide la franja (mientras
 * el scroll no la supere no tiene sentido esconderla). Si el cambio es menor al umbral, queda como estaba.
 */
export function franjaVisible(visibleAhora: boolean, y: number, anterior: number, alturaFranja: number): boolean {
  if (y <= alturaFranja) return true;
  const delta = y - anterior;
  if (delta > UMBRAL_SCROLL_PX) return false;
  if (delta < -UMBRAL_SCROLL_PX) return true;
  return visibleAhora;
}
