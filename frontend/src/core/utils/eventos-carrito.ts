/**
 * Aviso de "el carrito cambió" entre la página del carrito (M05) y la cabecera (Core Kit), sin que
 * uno importe al otro. Lo emite quien agrega, cambia o quita líneas; la cabecera lo escucha.
 */
export const EVENTO_CARRITO_ACTUALIZADO = 'pc:carrito-actualizado';

export function avisarCarritoActualizado(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENTO_CARRITO_ACTUALIZADO));
}

/**
 * Aviso para abrir el panel lateral del carrito (M05 · L1), con un mensaje opcional de lo que acaba de pasar al
 * agregar (L2). Quien muestra el panel lo "reclama" cancelando el evento: así quien lo abre sabe si hay panel en la
 * página o si debe seguir su camino normal (por ejemplo, el enlace a /carrito del encabezado).
 */
export const EVENTO_ABRIR_CARRITO = 'pc:abrir-carrito';

export type AvisoCarritoLateral = { tipo: 'agregado'; texto: string } | { tipo: 'error'; texto: string };

/** Pide abrir el panel lateral. Devuelve true si una página con panel lo atendió. */
export function abrirCarritoLateral(aviso: AvisoCarritoLateral | null = null): boolean {
  if (typeof window === 'undefined') return false;
  const evento = new CustomEvent<AvisoCarritoLateral | null>(EVENTO_ABRIR_CARRITO, { detail: aviso, cancelable: true });
  return !window.dispatchEvent(evento);
}

/** El mensaje que trae un aviso de apertura, o null si no trae ninguno. */
export function avisoDeApertura(evento: Event): AvisoCarritoLateral | null {
  if (!(evento instanceof CustomEvent)) return null;
  const detalle: unknown = evento.detail;
  if (typeof detalle !== 'object' || detalle === null) return null;
  const { tipo, texto } = detalle as Record<string, unknown>;
  if (typeof texto !== 'string') return null;
  if (tipo === 'agregado' || tipo === 'error') return { tipo, texto };
  return null;
}
