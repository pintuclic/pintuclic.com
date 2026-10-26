import type { MotivoNoVendible } from '../../m06-precios/dtos/m06-precios.dto';
import type { CodigoErrorCarrito } from '../dtos/m05-carrito.dto';

/** `details` del envelope (contrato, sección 4). */
export type DetallesCarrito =
  | { motivo: MotivoNoVendible }
  | { topeUnidades: number }
  | { cantidadMaxima: number }
  | null;

/**
 * Error de dominio de M05. `code` y `status` salen tal cual en el envelope
 * `{ success: false, error: { code, message, details } }`.
 */
export class CarritoError extends Error {
  constructor(
    public readonly code: CodigoErrorCarrito,
    message: string,
    public readonly status: number,
    public readonly details: DetallesCarrito = null,
  ) {
    super(message);
    this.name = 'CarritoError';
  }
}

export const errores = {
  /** C14: línea ajena o inexistente, sin distinguir. */
  noDisponible: (): CarritoError =>
    new CarritoError('RECURSO_NO_DISPONIBLE', 'El recurso solicitado no está disponible.', 404),
  cantidadFueraDeRango: (cantidadMaxima: number): CarritoError =>
    new CarritoError(
      'CANTIDAD_FUERA_DE_RANGO',
      `Cada producto admite hasta ${cantidadMaxima} unidades en el carrito.`,
      400,
      { cantidadMaxima },
    ),
  limiteLineas: (maximo: number): CarritoError =>
    new CarritoError(
      'LIMITE_LINEAS_ALCANZADO',
      `El carrito admite hasta ${maximo} productos distintos. Quite alguno para agregar otro.`,
      400,
    ),
  productoNoDisponible: (motivo: MotivoNoVendible): CarritoError =>
    new CarritoError('PRODUCTO_NO_DISPONIBLE', 'Este producto no se puede agregar al carrito en este momento.', 409, {
      motivo,
    }),
  sinExistencia: (topeUnidades: number): CarritoError =>
    new CarritoError(
      'SIN_EXISTENCIA_SUFICIENTE',
      `Solo hay ${topeUnidades} unidades disponibles de este producto.`,
      409,
      { topeUnidades },
    ),
};
