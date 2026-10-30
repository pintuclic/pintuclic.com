import type { Revalidacion } from '../../m05-carrito/dtos/m05-carrito.dto';
import type { CodigoErrorCheckout } from '../dtos/m07-checkout.dto';

type Detalles = Revalidacion | { codigo: string } | { motivo: string } | { costoEnvio: number } | null;

/** Error de dominio de M07: sale tal cual en `{ success: false, error: { code, message, details } }`. */
export class CheckoutError extends Error {
  constructor(
    public readonly code: CodigoErrorCheckout,
    message: string,
    public readonly status: number,
    public readonly details: Detalles = null,
  ) {
    super(message);
    this.name = 'CheckoutError';
  }
}

/** La pasarela no respondió o rechazó la petición (no el pago): R2 f. */
export class PasarelaNoDisponibleError extends Error {
  constructor(message = 'La pasarela de pagos no está disponible.') {
    super(message);
    this.name = 'PasarelaNoDisponibleError';
  }
}

/** M08 rechazó la orden por un motivo que no se arregla reintentando (R6). */
export class OrdenDefinitivaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrdenDefinitivaError';
  }
}

const MOTIVOS_CUPON: Record<string, string> = {
  cupon_agotado: 'El cupón ya se agotó.',
  cupon_usado_por_usuario: 'Ya usaste este cupón el máximo de veces.',
  cupon_no_vigente: 'El cupón ya no está vigente.',
};

export const errores = {
  /** R1, R16: ajena, inexistente o sin permiso, sin distinguir. */
  noDisponible: (): CheckoutError =>
    new CheckoutError('RECURSO_NO_DISPONIBLE', 'El recurso solicitado no está disponible.', 404),
  carritoVacio: (): CheckoutError =>
    new CheckoutError('CARRITO_VACIO', 'Tu carrito está vacío. Agrega productos antes de pagar.', 400),
  carritoCambio: (revalidacion: Revalidacion): CheckoutError =>
    new CheckoutError(
      'CARRITO_CAMBIO',
      'Tu carrito cambió desde que lo revisaste. Revisa los precios y vuelve a confirmar.',
      409,
      revalidacion,
    ),
  /** M10: el servicio de envíos cotizó otro valor distinto del que el cliente tenía en pantalla. */
  costoEnvioCambio: (costoEnvio: number): CheckoutError =>
    new CheckoutError(
      'COSTO_ENVIO_CAMBIO',
      'El costo del envío cambió. Revisa el total y vuelve a confirmar.',
      409,
      { costoEnvio },
    ),
  variasCotizaciones: (): CheckoutError =>
    new CheckoutError(
      'VARIAS_COTIZACIONES',
      'Tu carrito tiene productos de varias cotizaciones. Paga una cotización a la vez: quita los de las demás.',
      409,
    ),
  pagoEnCurso: (codigo: string): CheckoutError =>
    new CheckoutError('PAGO_EN_CURSO', 'Ya tienes un pago en curso. Termínalo en Nequi antes de empezar otro.', 409, {
      codigo,
    }),
  cupon: (motivo: string | null): CheckoutError =>
    new CheckoutError(
      'CUPON_NO_DISPONIBLE',
      `${MOTIVOS_CUPON[motivo ?? ''] ?? 'El cupón ya no se puede usar.'} Vuelve al carrito para ver el total sin él.`,
      409,
      { motivo: motivo ?? 'cupon_no_valido' },
    ),
  estado: (mensaje: string): CheckoutError => new CheckoutError('ESTADO_NO_PERMITE', mensaje, 409),
  vencida: (): CheckoutError =>
    new CheckoutError('SOLICITUD_VENCIDA', 'Esta compra venció. Vuelve al carrito para empezar de nuevo.', 409),
  limiteIntentos: (): CheckoutError =>
    new CheckoutError(
      'LIMITE_INTENTOS',
      'Llegaste al máximo de intentos para esta compra. Vuelve al carrito para empezar de nuevo.',
      409,
    ),
  productoNoDisponible: (tope: number): CheckoutError =>
    new CheckoutError(
      'PRODUCTO_NO_DISPONIBLE',
      `De este combo quedan ${tope} ${tope === 1 ? 'unidad' : 'unidades'}. Baja la cantidad e inténtalo de nuevo.`,
      409,
      { motivo: 'tope_combo' },
    ),
  pasarela: (): CheckoutError =>
    new CheckoutError(
      'PASARELA_NO_DISPONIBLE',
      'No pudimos conectar con Nequi en este momento. Inténtalo de nuevo en unos minutos.',
      503,
    ),
  firma: (): CheckoutError => new CheckoutError('FIRMA_INVALIDA', 'Firma inválida.', 401),
};
