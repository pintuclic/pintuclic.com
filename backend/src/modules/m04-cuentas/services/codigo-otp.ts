import crypto from 'node:crypto';

/** Código OTP de 6 dígitos con un generador criptográfico (Math.random es predecible). */
export function generarCodigoOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}
