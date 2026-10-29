/**
 * ============================================================================
 * PUERTO DE NOTIFICACIONES — M18 (ADR-009, migrado desde m04-cuentas)
 * ============================================================================
 * Desacopla cualquier módulo de negocio de la implementación SMTP real.
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
    | 'dictamen_empresa'
    | 'alerta_servicio_ia'
    | 'comprobante_venta'
    | 'estado_orden'
    | 'cotizacion_respondida'
    | 'cotizacion_rechazada';
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
  /**
   * M03 · I9: el servicio de IA acumuló los fallos consecutivos configurados. Opcional
   * para no romper los adaptadores existentes; M03 comprueba que esté antes de llamar y,
   * si el aviso falla, el resto del módulo sigue funcionando (M03 · A4).
   */
  notificarAlertaServicioIa?(
    correo: string,
    servicio: string,
    fallosConsecutivos: number,
  ): Promise<void>;
  /**
   * M12 · R9: avisa al cliente que su comprobante de venta está listo, con el número, el total ya formateado y el enlace
   * a su página (que exige sesión). Opcional por la misma razón que el aviso de IA; sin adjuntos ni datos del pedido.
   */
  notificarComprobanteVenta?(
    correo: string,
    datos: { nombre: string; numero: string; total: string; codigoOrden: string },
  ): Promise<void>;
  /**
   * HU-NOT-02 · RF-NOT-02-01: avisa al cliente que el estado de su pedido cambió. Recibe el código del estado nuevo
   * tal como lo emite M08; M18 no necesita conocer el catálogo completo. Opcional por la misma razón que los demás avisos.
   */
  notificarCambioEstadoOrden?(
    correo: string,
    datos: { nombre: string; codigoOrden: string; estadoNuevo: string },
  ): Promise<void>;
  /** HU-NOT-02 · RF-NOT-02-03: la cotización fue respondida; lleva el total acordado ya formateado y su vencimiento. */
  notificarCotizacionRespondida?(
    correo: string,
    datos: { nombre: string; codigo: string; idCotizacion: number; total: string; vencimiento: string },
  ): Promise<void>;
  /** HU-NOT-02 · RF-NOT-02-03: la cotización fue rechazada, con el motivo que escribió el personal. */
  notificarCotizacionRechazada?(
    correo: string,
    datos: { nombre: string; codigo: string; idCotizacion: number; motivo: string },
  ): Promise<void>;
}
