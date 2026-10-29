import { isAxiosError } from 'axios';
import { ZodError } from 'zod';
import { esRespuestaError } from '@/core/api/apiClient';

const RESPALDO = 'No se pudo completar la acción. Inténtelo de nuevo.';

/**
 * Prefiere el mensaje de dominio del envelope de la API (p. ej. «La orden cambió de estado mientras la consultaba»),
 * que el servidor redacta para el personal y no revela nada interno; si no hay, el respaldo. Una respuesta que no
 * cumple el contrato (`ZodError`) nunca llega a la pantalla: su detalle técnico es para soporte y va a la consola.
 */
export function mensajeDeError(err: unknown): string {
  if (err instanceof ZodError) {
    console.error('[M09] La respuesta de la API no cumple el contrato:', err.issues);
    return RESPALDO;
  }
  if (isAxiosError<unknown>(err)) {
    const cuerpo = err.response?.data;
    return esRespuestaError(cuerpo) ? cuerpo.error.message : RESPALDO;
  }
  return RESPALDO;
}
