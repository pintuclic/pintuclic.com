/**
 * ============================================================================
 * PUERTO DE NOTIFICACIONES — M04 (ADR-009)
 * ============================================================================
 * Desacopla la lógica de cuentas de la implementación de correo SMTP (M18).
 * En tests se sustituye por MemoriaNotificacionesAdapter.
 * ============================================================================
 */

export interface EventoNotificacion {
  tipo:
    | 'registro_otp'
    | 'recuperacion_password'
    | 'activacion_empleado'
    | 'cambio_correo_otp'
    | 'cambio_correo_confirmado'
    | 'dictamen_empresa';
  destinatario: string;
  timestamp: Date;
  metadatos: Record<string, string | number | boolean>;
}

export interface NotificacionesPort {
  enviarCodigoRegistro(correo: string, codigoOtp: string, minutosVigencia: number): Promise<void>;
  enviarEnlaceRecuperacion(correo: string, token: string, minutosVigencia: number): Promise<void>;
  /** HU-ADM-01: el empleado nuevo fija su contraseña desde este enlace. */
  enviarEnlaceActivacion(correo: string, nombre: string, token: string, horasVigencia: number): Promise<void>;
  enviarCodigoCambioCorreo(correoNuevo: string, codigoOtp: string, minutosVigencia: number): Promise<void>;
  notificarDictamenEmpresa(
    correo: string,
    resultado: 'aprobada' | 'rechazada',
    motivoRechazo?: string
  ): Promise<void>;
  notificarCambioCorreoConfirmado?(correoAnterior: string, nuevoCorreo: string): Promise<void>;
}