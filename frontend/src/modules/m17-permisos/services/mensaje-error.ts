import { isAxiosError } from 'axios';
import { esRespuestaError } from '@/core/api/apiClient';

/**
 * Traduce un fallo de red al mensaje de dominio que emitió la API.
 *
 * Un `AxiosError` también es un `Error`, así que leer `err.message` sin más
 * entrega al usuario textos como "Request failed with status code 409" en vez
 * del motivo real (correo duplicado de HU-CUE-08, permiso denegado, token
 * inválido). Aquí se prefiere el `error.message` del envelope canónico y solo
 * se cae al respaldo cuando la respuesta no trae uno legible.
 */
export function mensajeDeError(err: unknown, respaldo: string): string {
  if (isAxiosError<unknown>(err)) {
    const cuerpo = err.response?.data;
    return esRespuestaError(cuerpo) ? cuerpo.error.message : respaldo;
  }
  return err instanceof Error && err.message ? err.message : respaldo;
}
