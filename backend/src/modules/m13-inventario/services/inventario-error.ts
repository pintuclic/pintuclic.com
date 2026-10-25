import type { CODIGOS_ERROR_INVENTARIO } from '../dtos/m13-inventario.dto';

export type CodigoErrorInventario = (typeof CODIGOS_ERROR_INVENTARIO)[number];

/** `details` del envelope: la existencia vigente en un conflicto (R4); null en el resto. */
export type DetallesInventario = { existenciaActual: number } | null;

/**
 * Error de dominio de M13. `code` y `status` salen tal cual en el envelope
 * `{ success: false, error: { code, message, details } }` (contrato, sección 5).
 */
export class InventarioError extends Error {
  constructor(
    public readonly code: CodigoErrorInventario,
    message: string,
    public readonly status: number,
    public readonly details: DetallesInventario = null,
  ) {
    super(message);
    this.name = 'InventarioError';
  }
}

export const errores = {
  /** 404: recurso inexistente (y, en el middleware, toda denegación). */
  noDisponible: (): InventarioError =>
    new InventarioError('RECURSO_NO_DISPONIBLE', 'El recurso solicitado no está disponible.', 404),
  parametroInvalido: (mensaje: string): InventarioError => new InventarioError('PARAMETRO_INVALIDO', mensaje, 400),
  conflicto: (existenciaActual: number): InventarioError =>
    new InventarioError(
      'CONFLICTO_EXISTENCIA',
      'La existencia cambió mientras la editaba. Revise el valor actual y vuelva a intentarlo.',
      409,
      { existenciaActual },
    ),
  plantillaGrande: (maximo: number): InventarioError =>
    new InventarioError(
      'PLANTILLA_DEMASIADO_GRANDE',
      `La plantilla supera ${maximo} variantes. Descárguela por marca.`,
      409,
    ),
};
