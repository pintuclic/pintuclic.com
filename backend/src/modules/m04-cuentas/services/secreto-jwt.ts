/**
 * Secreto de los tokens efímeros de M04 (primer acceso, registro Google y recuperación).
 *
 * Mismo criterio que core/utils/jwt.ts: sin valor de respaldo. Un secreto ausente
 * o corto es un error de despliegue y debe fallar, no firmar con una clave pública.
 */
export function obtenerSecretoJwt(): string {
  const secreto = process.env.JWT_SECRET;
  if (secreto === undefined || secreto.length < 32) {
    throw new Error('JWT_SECRET ausente o demasiado corto: se exigen al menos 32 caracteres.');
  }
  return secreto;
}
