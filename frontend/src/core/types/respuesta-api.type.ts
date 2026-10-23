/**
 * Envelope canónico de la API.
 * Espejo de contracts/m20-seguridad.contract.ts y de
 * PINTUCLIC_CONTEXT.md §6.5. Es una unión discriminada: `success` distingue
 * las dos formas y TypeScript obliga a comprobarlo antes de leer `data`.
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

export type RespuestaApi<T> = RespuestaExitosa<T> | RespuestaError;
