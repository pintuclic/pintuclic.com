/**
 * ============================================================================
 * PUERTO DE RELOJ INYECTABLE — M04 (ATDD)
 * ============================================================================
 * Permite inyectar la fecha actual para probar determinísticamente los casos
 * de frontera BVA (ej. expiración de OTP en 14:59 vs 15:01).
 * ============================================================================
 */

export interface DateProviderPort {
  ahora(): Date;
}
