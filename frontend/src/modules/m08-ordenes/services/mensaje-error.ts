import { isAxiosError } from 'axios';
import { ZodError } from 'zod';
import { esRespuestaError } from '@/core/api/apiClient';

/**
 * Prefiere el mensaje de dominio del envelope de la API; si no hay, el respaldo. Una respuesta que no
 * cumple el contrato (`ZodError`) nunca llega a la pantalla: su detalle técnico es para soporte y va a
 * la consola.
 */
export function mensajeDeError(err: unknown, respaldo: string): string {
  if (err instanceof ZodError) {
    console.error('[M08] La respuesta de la API no cumple el contrato:', err.issues);
    return respaldo;
  }
  if (isAxiosError<unknown>(err)) {
    const cuerpo = err.response?.data;
    return esRespuestaError(cuerpo) ? cuerpo.error.message : respaldo;
  }
  return err instanceof Error && err.message ? err.message : respaldo;
}

/** El código de error de dominio (p. ej. `ESTADO_CAMBIADO`), si la API lo envió. */
export function codigoDeError(err: unknown): string | null {
  if (!isAxiosError<unknown>(err)) return null;
  const cuerpo = err.response?.data;
  return esRespuestaError(cuerpo) ? cuerpo.error.code : null;
}
