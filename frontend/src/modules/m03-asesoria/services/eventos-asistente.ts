/**
 * Aviso para abrir el asistente flotante desde cualquier punto de la tienda, sin que quien lo
 * pide tenga que importar el panel ni saber dónde está montado.
 *
 * Mismo patrón que el panel lateral del carrito (`core/utils/eventos-carrito`): quien muestra
 * el panel "reclama" el evento cancelándolo, así quien lo pide sabe si había panel escuchando
 * o si debe seguir su camino normal (por ejemplo, navegar a /asesoria).
 */
export const EVENTO_ABRIR_ASISTENTE = 'pc:abrir-asistente';

/** Pide abrir el asistente. Devuelve true si un panel lo atendió. */
export function abrirAsistente(): boolean {
  if (typeof window === 'undefined') return false;
  const evento = new Event(EVENTO_ABRIR_ASISTENTE, { cancelable: true });
  return !window.dispatchEvent(evento);
}
