/**
 * Envelope canónico de respuesta HTTP.
 * Regla de Oro #5 del Backend: ninguna respuesta se sale de este sobre.
 */
export interface RespuestaExitosa<T> {
  success: true;
  data: T;
  message?: string;
}

export type CodigoError =
  | 'RECURSO_NO_DISPONIBLE'
  | 'SESION_EXPIRADA'
  | 'CREDENCIALES_INVALIDAS'
  | 'CONSENTIMIENTO_REQUERIDO'
  | 'SOLICITUD_DUPLICADA'
  | 'ERROR_INTERNO';

export interface RespuestaError {
  success: false;
  error: {
    code: CodigoError;
    message: string;
    details: null;
  };
}
