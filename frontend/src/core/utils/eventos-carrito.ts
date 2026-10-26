/**
 * Aviso de "el carrito cambió" entre la página del carrito (M05) y la cabecera (Core Kit), sin que
 * uno importe al otro. Lo emite quien agrega, cambia o quita líneas; la cabecera lo escucha.
 */
export const EVENTO_CARRITO_ACTUALIZADO = 'pc:carrito-actualizado';

export function avisarCarritoActualizado(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENTO_CARRITO_ACTUALIZADO));
}
