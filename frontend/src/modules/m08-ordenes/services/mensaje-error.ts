import { isAxiosError } from 'axios';
import { esRespuestaError } from '@/core/api/apiClient';

/** Prefiere el mensaje de dominio del envelope de la API; si no hay, el respaldo. */
export function mensajeDeError(err: unknown, respaldo: string): string {
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
