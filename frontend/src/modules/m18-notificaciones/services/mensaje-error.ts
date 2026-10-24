import { isAxiosError } from 'axios';
import { esRespuestaError } from '@/core/api/apiClient';

/**
 * Traduce un fallo de red al mensaje de dominio que emitió la API, igual que
 * en m17-permisos: se prefiere el `error.message` del envelope canónico y
 * solo se cae al respaldo cuando la respuesta no trae uno legible.
 */
export function mensajeDeError(err: unknown, respaldo: string): string {
  if (isAxiosError<unknown>(err)) {
    const cuerpo = err.response?.data;
    return esRespuestaError(cuerpo) ? cuerpo.error.message : respaldo;
  }
  return err instanceof Error && err.message ? err.message : respaldo;
}
