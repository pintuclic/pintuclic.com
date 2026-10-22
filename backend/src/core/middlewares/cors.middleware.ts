import cors from 'cors';
import type { RequestHandler } from 'express';

/**
 * RNF-SEG-06-01 y ADR-005.
 *
 * `credentials: true` es imprescindible porque la sesión viaja en cookie. Eso
 * obliga a un origen explícito: el comodín `*` es incompatible con credenciales,
 * y además sería una política permisiva que M20 no puede permitirse.
 */
export function construirCors(): RequestHandler {
  const origenes = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o.length > 0);

  if (origenes.length === 0) {
    throw new Error('CORS_ORIGIN no configurado: M20 no admite una política de origen abierta.');
  }

  return cors({
    origin: origenes,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type'],
  });
}
