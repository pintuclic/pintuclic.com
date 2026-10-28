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
  /** R12: el cliente no puede agregar mensajes cuando la solicitud está atendida o rechazada. */
  solicitudCerrada: (): AtencionError =>
    new AtencionError(
      'SOLICITUD_CERRADA',
      'Esta solicitud ya fue cerrada y no admite nuevos mensajes. Si tienes otra inquietud, crea una solicitud nueva.',
      409,
    ),
  /** R12: el cliente solo puede enviar 1 mensaje seguido mientras el equipo no haya respondido. */
  esperandoRespuestaEquipo: (): AtencionError =>
    new AtencionError(
      'ESPERANDO_RESPUESTA_EQUIPO',
      'Ya enviaste un mensaje. Podrás enviar otro cuando nuestro equipo te responda.',
      409,
    ),
  /** R13: solo se puede calificar una solicitud que esté en estado atendida. */
  solicitudNoCalificable: (): AtencionError =>
    new AtencionError(
      'SOLICITUD_NO_CALIFICABLE',
      'Solo puedes calificar una solicitud cuando ha sido marcada como atendida.',
      409,
    ),
  /** R6 / RF-ATC-02-08. */
  limiteSolicitudes: (): AtencionError =>
    new AtencionError(
      'LIMITE_SOLICITUDES_EXCEDIDO',
      'Ya enviaste varias solicitudes seguidas. Espera un momento antes de enviar otra.',
      429,
    ),
};