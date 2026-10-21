import type { Response } from 'express';
import type { CodigoError, RespuestaError, RespuestaExitosa } from '../types/api.types';

export function responderExito<T>(
  res: Response,
  data: T,
  message?: string,
  status = 200,
): Response {
  const cuerpo: RespuestaExitosa<T> =
    message === undefined ? { success: true, data } : { success: true, data, message };
  return res.status(status).json(cuerpo);
}

export function construirError(code: CodigoError, message: string): RespuestaError {
  return { success: false, error: { code, message, details: null } };
}

/**
 * ⚠️ RN-SEG-08 / ADR-003 — INDISTINGUIBILIDAD.
 *
 * Un recurso inexistente y un recurso existente pero ajeno devuelven ESTE MISMO
 * objeto con HTTP 404. No son dos respuestas equivalentes: es la misma. Si
 * fueran dos ramas distintas acabarían divergiendo y permitirían enumerar
 * recursos ajenos (CA-SEG-03-06).
 */
export const RESPUESTA_RECURSO_NO_DISPONIBLE: RespuestaError = Object.freeze(
  construirError('RECURSO_NO_DISPONIBLE', 'El recurso solicitado no está disponible.'),
);

export function responderRecursoNoDisponible(res: Response): Response {
  return res.status(404).json(RESPUESTA_RECURSO_NO_DISPONIBLE);
}
