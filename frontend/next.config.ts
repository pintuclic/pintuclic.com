import type { NextConfig } from 'next';
import path from 'path';

/**
 * El navegador llama siempre a `/api/v1/...` en el mismo origen (base por defecto
 * de `apiClient`): así la cookie de sesión `HttpOnly` + `SameSite=Strict` viaja
 * sin CORS (ADR-005). Next reenvía la petición al backend, que monta sus rutas en
 * `/api/v1`, conservando el prefijo.
 *
 * `BACKEND_URL` es solo de servidor y se lee AL COMPILAR: los rewrites quedan
 * fijados en el build (en Docker llega como `ARG`). Por omisión, el backend local.
 */
const BACKEND_URL = (process.env.BACKEND_URL ?? 'http://localhost:3000').replace(/\/+$/, '');

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname),
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
  /**
   * `/faq` mostraba exactamente la misma vista que `/centro-de-ayuda`: dos rutas
   * para una sola página. Queda el centro de ayuda, que además lleva el contacto
   * con el equipo. Permanente para no perder los enlaces ya compartidos.
   */
  async redirects() {
    return [
      {
        source: '/faq',
        destination: '/centro-de-ayuda',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
