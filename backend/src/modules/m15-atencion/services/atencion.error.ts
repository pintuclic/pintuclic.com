import type { CodigoErrorAtencion } from '../dtos/m15-atencion.dto';

/**
 * Error de dominio de M15. `code` y `status` salen tal cual en el envelope
 * `{ success: false, error: { code, message, details } }` (contrato, sección 5).
 */
export class AtencionError extends Error {
  constructor(
    public readonly code: CodigoErrorAtencion,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'AtencionError';
  }
}

export const MENSAJE_NO_DISPONIBLE = 'El recurso solicitado no está disponible.';

export const errores = {
  /** R11 / ADR-003: recurso inexistente y denegación comparten esta salida. */
  noDisponible: (): AtencionError => new AtencionError('RECURSO_NO_DISPONIBLE', MENSAJE_NO_DISPONIBLE, 404),
  parametroInvalido: (mensaje: string): AtencionError => new AtencionError('PARAMETRO_INVALIDO', mensaje, 400),
  /** R6 / RF-ATC-02-08. */
  limiteSolicitudes: (): AtencionError =>
    new AtencionError(
      'LIMITE_SOLICITUDES_EXCEDIDO',
      'Ya enviaste varias solicitudes seguidas. Espera un momento antes de enviar otra.',
      429,
    ),
};
