import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';

/**
 * HU-SEG-02 — El token transporta ÚNICAMENTE el identificador de sesión (`sid`).
 *
 * Decisión deliberada: no se embute ningún permiso ni rol en el token. RF-ADM-03-03
 * exige resolver los permisos en el momento de cada operación; un permiso cacheado
 * en el token sobreviviría a su revocación (CA-SEG-02-05).
 */

export interface ContenidoToken {
  sid: string;
}

function obtenerSecreto(): string {
  const secreto = process.env.JWT_SECRET;
  if (secreto === undefined || secreto.length < 32) {
    throw new Error('JWT_SECRET ausente o demasiado corto: se exigen al menos 32 caracteres.');
  }
  return secreto;
}

export function emitirToken(sid: string, vigenciaSegundos: number): string {
  const opciones: SignOptions = { expiresIn: vigenciaSegundos, algorithm: 'HS256' };
  return jwt.sign({ sid }, obtenerSecreto(), opciones);
}

/** Devuelve el `sid` o `null`. Nunca lanza hacia el llamador: un token inválido no es excepcional. */
export function leerToken(token: string): ContenidoToken | null {
  try {
    const payload = jwt.verify(token, obtenerSecreto(), { algorithms: ['HS256'] });
    if (typeof payload === 'string' || typeof payload.sid !== 'string') {
      return null;
    }
    return { sid: payload.sid };
  } catch {
    return null;
  }
}
