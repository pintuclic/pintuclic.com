import axios from 'axios';
import type { AxiosError } from 'axios';
import { useAuthStore } from '@/core/store/authStore';
import type { RespuestaError } from '@/core/types/respuesta-api.type';

/**
 * Cliente HTTP centralizado.
 *
 * ⚠️ ADR-005 / RNF-SEG-02-01 — No lee ni adjunta ningún token. El identificador
 * de sesión viaja en una cookie `HttpOnly` que el navegador envía solo gracias a
 * `withCredentials`, y que el código de la página no puede leer.
 */
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

function esRespuestaError(cuerpo: unknown): cuerpo is RespuestaError {
  if (typeof cuerpo !== 'object' || cuerpo === null) {
    return false;
  }
  const candidato = cuerpo as { success?: unknown; error?: unknown };
  return candidato.success === false && typeof candidato.error === 'object';
}

/**
 * HU-SEG-02 — Reacción a la expiración de sesión.
 *
 * El backend responde 401 con el código `SESION_EXPIRADA` (RF-SEG-02-08). Aquí
 * se limpia el usuario del store y se recuerda el destino que pretendía
 * alcanzar, para volver a él tras re-autenticarse (CA-SEG-02-06).
 *
 * La redirección en sí la decide la vista: este interceptor no navega, para no
 * interrumpir peticiones de fondo ni pelearse con el router.
 */
apiClient.interceptors.response.use(
  (respuesta) => respuesta,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      const estado = useAuthStore.getState();
      estado.limpiarSesion();
      if (typeof window !== 'undefined') {
        estado.recordarDestino(`${window.location.pathname}${window.location.search}`);
      }
    }
    return Promise.reject(error);
  },
);

export { esRespuestaError };
