import { isAxiosError } from 'axios';
import { esRespuestaError } from '@/core/api/apiClient';

/** Datos de un 409 CONFIRMACION_REQUERIDA: lo que se afecta al desactivar (R6). */
export interface ErrorCatalogo {
  status: number | null;
  code: string | null;
  message: string;
  details: unknown;
}

/**
 * Traduce un fallo de red al error de dominio de la API. Nunca se muestra el texto crudo
 * de axios ("Request failed with status code 409"): se prefiere el `error.message` del envelope.
 */
export function leerErrorCatalogo(err: unknown, respaldo: string): ErrorCatalogo {
  if (isAxiosError<unknown>(err)) {
    const cuerpo = err.response?.data;
    if (esRespuestaError(cuerpo)) {
      return {
        status: err.response?.status ?? null,
        code: String(cuerpo.error.code),
        message: cuerpo.error.message,
        details: cuerpo.error.details,
      };
    }
    return { status: err.response?.status ?? null, code: null, message: respaldo, details: null };
  }
  return {
    status: null,
    code: null,
    message: err instanceof Error && err.message ? err.message : respaldo,
    details: null,
  };
}

export function mensajeDeError(err: unknown, respaldo: string): string {
  return leerErrorCatalogo(err, respaldo).message;
}
