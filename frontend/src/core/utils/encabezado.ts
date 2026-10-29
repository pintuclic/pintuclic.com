/** Hasta cuántos píxeles de scroll se considera que la página sigue «arriba de todo» (un temblor del dedo o del trackpad no cuenta). */
export const MARGEN_ARRIBA_PX = 2;

/**
 * Decide si la franja azul de información (Topbar) debe verse: solo cuando la página está de verdad arriba de todo.
 * En cuanto se baja se pliega y no vuelve hasta regresar al inicio. No reaparece al subir un poco: eso movía la cabecera
 * (y el botón que la persona acababa de tocar) justo cuando iba a hacer clic.
 */
export function franjaVisible(scrollY: number): boolean {
  return scrollY <= MARGEN_ARRIBA_PX;
}
