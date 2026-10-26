import { createHash, randomBytes } from 'node:crypto';

/** C2: 32 bytes aleatorios en base64url = 43 caracteres. */
const FORMATO_TOKEN = /^[A-Za-z0-9_-]{43}$/;

/** C2: token opaco del visitante; no lleva ningún dato personal (RNF-CAR-01-01). */
export function generarTokenVisitante(): string {
  return randomBytes(32).toString('base64url');
}

/** Lo que se guarda en `carrito.token_visitante`: nunca el token, solo su SHA-256. */
export function hashTokenVisitante(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Un valor de cookie con otra forma se trata como si no hubiera cookie. */
export function esTokenVisitanteValido(valor: unknown): valor is string {
  return typeof valor === 'string' && FORMATO_TOKEN.test(valor);
}
