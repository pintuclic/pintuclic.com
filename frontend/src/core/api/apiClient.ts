import axios from 'axios';

/**
 * Cliente HTTP centralizado.
 *
 * ⚠️ ADR-005 / RNF-SEG-02-01 — No lee ni adjunta ningún token. El identificador
 * de sesión viaja en una cookie `HttpOnly` que el navegador envía sola gracias a
 * `withCredentials`, y que el código de la página no puede leer.
 *
 * La versión anterior lo tomaba de `localStorage`, accesible para cualquier
 * script de la página: incumplía el requisito de forma directa.
 */
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});
