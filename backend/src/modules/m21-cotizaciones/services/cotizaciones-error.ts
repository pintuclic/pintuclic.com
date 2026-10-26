import type { CodigoErrorCotizaciones } from '../dtos/m21-cotizaciones.dto';

/** Error de dominio de M21: sale tal cual en `{ success: false, error: { code, message, details } }`. */
export class CotizacionesError extends Error {
  constructor(
    public readonly code: CodigoErrorCotizaciones,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'CotizacionesError';
  }
}

export const errores = {
  /** R1, R12: ajena, inexistente o sin permiso, sin distinguir. */
  noDisponible: (): CotizacionesError =>
    new CotizacionesError('RECURSO_NO_DISPONIBLE', 'El recurso solicitado no está disponible.', 404),
  parametroInvalido: (mensaje: string): CotizacionesError => new CotizacionesError('PARAMETRO_INVALIDO', mensaje, 400),
  carritoVacio: (): CotizacionesError =>
    new CotizacionesError(
      'CARRITO_VACIO',
      'Tu carrito no tiene productos disponibles para cotizar. Agrega productos e intenta de nuevo.',
      400,
    ),
  limite: (maximo: number): CotizacionesError =>
    new CotizacionesError(
      'LIMITE_COTIZACIONES',
      `Ya tienes ${maximo} cotizaciones abiertas. Espera la respuesta de alguna antes de pedir otra.`,
      409,
    ),
  estado: (mensaje: string): CotizacionesError => new CotizacionesError('ESTADO_NO_PERMITE', mensaje, 409),
  incompleta: (): CotizacionesError =>
    new CotizacionesError('COTIZACION_INCOMPLETA', 'Falta el precio acordado de alguna línea.', 400),
  vencida: (): CotizacionesError =>
    new CotizacionesError('COTIZACION_VENCIDA', 'Esta cotización ya venció. Puedes pedir una nueva desde tu carrito.', 409),
  carritoLleno: (): CotizacionesError =>
    new CotizacionesError(
      'CARRITO_LLENO',
      'Tu carrito no tiene espacio para estos productos. Quita algunos y vuelve a aceptar la cotización.',
      409,
    ),
};
