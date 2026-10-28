/**
 * ============================================================================
 * PUERTO DE PARÁMETROS DE COMUNICACIONES — M18 (RF-NOT-01-03)
 * ============================================================================
 * El administrador edita este valor en la configuración general (M17). M18 lo
 * lee por este puerto sin importar código de M17: la composición raíz
 * (app.routes.ts) conecta el adaptador, igual que ya hace para M04.
 * ============================================================================
 */

export type ClaveParametroComunicaciones = 'comms.reintentos_envio_transaccional';

export interface ParametrosComunicacionesPort {
  /** Valor numérico vigente, o `null` si no está configurado. */
  obtenerNumero(clave: ClaveParametroComunicaciones): Promise<number | null>;
}
