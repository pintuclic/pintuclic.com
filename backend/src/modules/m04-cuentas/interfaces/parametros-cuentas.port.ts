/**
 * ============================================================================
 * PUERTO DE PARÁMETROS DE AUTENTICACIÓN — M04 (HU-ADM-07 / RF-ADM-07-02)
 * ============================================================================
 * El administrador edita estos valores en la configuración general (M17). M04
 * los lee por este puerto sin importar código de M17: la composición raíz
 * (app.routes.ts) conecta el adaptador.
 * ============================================================================
 */

export type ClaveParametroCuentas =
  | 'auth.vigencia_codigo_registro_minutos'
  | 'auth.intentos_codigo_registro'
  | 'auth.vigencia_enlace_recuperacion_minutos'
  | 'auth.intentos_fallidos_bloqueo'
  | 'auth.duracion_bloqueo_minutos'
  | 'auth.vigencia_enlace_activacion_horas';

export interface ParametrosCuentasPort {
  /** Valor numérico vigente, o `null` si no está configurado. */
  obtenerNumero(clave: ClaveParametroCuentas): Promise<number | null>;
}
