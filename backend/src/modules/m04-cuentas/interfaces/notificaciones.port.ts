/**
 * ============================================================================
 * PUERTO DE NOTIFICACIONES — M04 (ADR-009)
 * ============================================================================
 * Desacopla la lógica de cuentas de la implementación de correo SMTP (M18).
 * En tests se sustituye por MemoriaNotificacionesAdapter.
 * ============================================================================
 */

export interface EventoNotificacion {
  tipo: 'registro_otp' | 'recuperacion_password' | 'cambio_correo_otp' | 'dictamen_empresa';
  destinatario: string;
  timestamp: Date;
  metadatos: Record<string, string | number | boolean>;
}

export interface NotificacionesPort {
  enviarCodigoRegistro(correo: string, codigoOtp: string, minutosVigencia: number): Promise<void>;
  enviarEnlaceRecuperacion(correo: string, token: string, minutosVigencia: number): Promise<void>;
  enviarCodigoCambioCorreo(correoNuevo: string, codigoOtp: string, minutosVigencia: number): Promise<void>;
  notificarDictamenEmpresa(
    correo: string,
    resultado: 'aprobada' | 'rechazada',
    motivoRechazo?: string
  ): Promise<void>;
}
