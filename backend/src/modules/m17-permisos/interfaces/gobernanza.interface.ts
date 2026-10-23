export interface SolicitudCambioCorreoAdmin {
  idUsuario: number;
  correoActual: string;
  nuevoCorreo: string;
  tokenConfirmacion: string;
  fechaExpiracion: Date;
}

export interface GobernanzaNotificacionesPort {
  enviarSolicitudSustitucionCorreoAdmin(params: {
    correoActual: string;
    nuevoCorreo: string;
    tokenConfirmacion: string;
    minutosVigencia: number;
  }): Promise<void>;
}

export interface GobernanzaAdminRepositoryPort {
  obtenerAdmin(): Promise<{ idUsuario: number; correo: string; nombre: string } | null>;
  guardarSolicitudCambioCorreo(solicitud: SolicitudCambioCorreoAdmin): Promise<void>;
  buscarSolicitudPorToken(token: string): Promise<SolicitudCambioCorreoAdmin | null>;
  eliminarSolicitud(token: string): Promise<void>;
  actualizarCorreoAdmin(idUsuario: number, nuevoCorreo: string): Promise<void>;
}