/** «29 de octubre de 2026, 10:30 a. m.» en hora de Colombia, que es la de los clientes y del almacén. */
export function fechaDelComprobante(iso: string): string {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Bogota' }).format(new Date(iso));
}

/** Lo que falta de la ficha del vendedor, dicho para quien la llena. */
export const ETIQUETA_FALTANTE: Record<'razonSocial' | 'nit' | 'direccion', string> = {
  razonSocial: 'la razón social',
  nit: 'el NIT',
  direccion: 'la dirección',
};

export function textoFaltantes(faltantes: ReadonlyArray<keyof typeof ETIQUETA_FALTANTE>): string {
  return faltantes.map((f) => ETIQUETA_FALTANTE[f]).join(', ');
}

/** Mensaje de la pantalla según lo que responda el servidor al pedir el comprobante. */
export function mensajeDeComprobanteNoDisponible(): string {
  return 'Todavía no está disponible el comprobante de este pedido. Si acabas de comprar, vuelve a intentarlo en unos minutos; si el problema sigue, escríbenos desde el Centro de ayuda.';
}

/** El mensaje que el servidor escribió para el personal (por ejemplo, qué dato del vendedor falta), si lo trae. */
export function mensajeDelServidor(error: unknown): string | null {
  const cuerpo = (error as { response?: { data?: { error?: { message?: unknown } } } }).response?.data?.error?.message;
  return typeof cuerpo === 'string' && cuerpo !== '' ? cuerpo : null;
}
