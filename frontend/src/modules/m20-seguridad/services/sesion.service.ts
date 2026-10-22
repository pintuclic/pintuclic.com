import { apiClient } from '@/core/api/apiClient';
import type { RespuestaExitosa } from '@/core/types/respuesta-api.type';
import type { SesionCerrada } from '../interfaces/sesion.interface';

/**
 * HU-SEG-02 — Cierre explícito de sesión (RF-SEG-02-04).
 *
 * No recibe identificador alguno: la sesión se identifica por la cookie y el
 * servidor la resuelve. Enviar un id desde el cliente sería justo lo que
 * prohíbe la regla Anti-IDOR.
 */
export async function cerrarSesion(): Promise<SesionCerrada> {
  const { data } = await apiClient.post<RespuestaExitosa<SesionCerrada>>(
    '/seguridad/sesiones/cerrar',
    {},
  );
  return data.data;
}
