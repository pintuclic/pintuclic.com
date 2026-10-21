import bcrypt from 'bcrypt';

/**
 * HU-SEG-01 — Derivación y verificación de credenciales.
 *
 * RN-SEG-01: derivación con sal única por usuario; la verificación deriva y
 * compara, nunca descifra ni reconstruye.
 */

/** RNF-SEG-01-02: ajustable por entorno sin migrar las contraseñas ya almacenadas. */
const COSTE_MINIMO = 12;

export function obtenerCosteDerivacion(): number {
  const bruto = process.env.BCRYPT_COST;
  const valor = bruto === undefined ? COSTE_MINIMO : Number.parseInt(bruto, 10);
  if (!Number.isInteger(valor) || valor < COSTE_MINIMO) {
    throw new Error(
      `Coste de derivación inválido: se exige un entero >= ${COSTE_MINIMO} (HU-SEG-01).`,
    );
  }
  return valor;
}

/** Deriva la contraseña. bcrypt genera una sal única por llamada (CA-SEG-01-02). */
export async function derivarContrasena(contrasenaPlana: string): Promise<string> {
  return bcrypt.hash(contrasenaPlana, obtenerCosteDerivacion());
}

/**
 * RNF-SEG-01-01: `bcrypt.compare` compara en tiempo constante, de modo que el
 * tiempo de respuesta no revela cuántos caracteres coincidían.
 */
export async function verificarContrasena(
  contrasenaPlana: string,
  derivacionAlmacenada: string,
): Promise<boolean> {
  return bcrypt.compare(contrasenaPlana, derivacionAlmacenada);
}
