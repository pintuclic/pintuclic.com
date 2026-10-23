import type { EventoNotificacion, NotificacionesPort } from '../interfaces/notificaciones.port';

export class MemoriaNotificacionesAdapter implements NotificacionesPort {
  public eventos: EventoNotificacion[] = [];

  async enviarCodigoRegistro(correo: string, codigoOtp: string, minutosVigencia: number): Promise<void> {
    this.eventos.push({
      tipo: 'registro_otp',
      destinatario: correo,
      timestamp: new Date(),
      metadatos: { codigoOtp, minutosVigencia },
    });
  }

  async enviarEnlaceRecuperacion(correo: string, token: string, minutosVigencia: number): Promise<void> {
    this.eventos.push({
      tipo: 'recuperacion_password',
      destinatario: correo,
      timestamp: new Date(),
      metadatos: { token, minutosVigencia },
    });
  }

  async enviarCodigoCambioCorreo(correoNuevo: string, codigoOtp: string, minutosVigencia: number): Promise<void> {
    this.eventos.push({
      tipo: 'cambio_correo_otp',
      destinatario: correoNuevo,
      timestamp: new Date(),
      metadatos: { codigoOtp, minutosVigencia },
    });
  }

  async notificarDictamenEmpresa(
    correo: string,
    resultado: 'aprobada' | 'rechazada',
    motivoRechazo?: string,
  ): Promise<void> {
    this.eventos.push({
      tipo: 'dictamen_empresa',
      destinatario: correo,
      timestamp: new Date(),
      metadatos: {
        resultado,
        motivoRechazo: motivoRechazo ?? '',
      },
    });
  }

  obtenerEventos(): EventoNotificacion[] {
    return [...this.eventos];
  }

  obtenerUltimoOtp(destinatario?: string): string | undefined {
    const filtrados = destinatario
      ? this.eventos.filter((e) => e.destinatario.toLowerCase() === destinatario.toLowerCase())
      : this.eventos;
    const ultimo = filtrados[filtrados.length - 1];
    return ultimo?.metadatos?.codigoOtp as string | undefined;
  }

  limpiar(): void {
    this.eventos = [];
  }
}

export class NoOpNotificacionesAdapter implements NotificacionesPort {
  async enviarCodigoRegistro(): Promise<void> {
    // No-op para entornos sin servidor SMTP
  }

  async enviarEnlaceRecuperacion(): Promise<void> {
    // No-op
  }

  async enviarCodigoCambioCorreo(): Promise<void> {
    // No-op
  }

  async notificarDictamenEmpresa(): Promise<void> {
    // No-op
  }
}
