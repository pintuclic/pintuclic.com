import type {
  CalificacionAtencion,
  ConfiguracionWhatsapp,
  EstadoSolicitudContacto,
  FranjaHorario,
  MensajeSolicitudContacto,
  RolAutorMensaje,
  SolicitudContacto,
  SolicitudContactoDetalle,
  TipoSolicitudContacto,
} from '../dtos/m15-atencion.dto';

/**
 * Puertos de persistencia de M15. Solo tipos, cero runtime (AGENTS.md).
 */

export interface FiltroSolicitudes {
  idUsuario?: number;
  tipo?: TipoSolicitudContacto;
  estado?: EstadoSolicitudContacto;
  pagina: number;
  limite: number;
}

export interface PaginaSolicitudes {
  items: SolicitudContacto[];
  total: number;
}

export interface ContactoRepositoryPort {
  crear(idUsuario: number, tipo: TipoSolicitudContacto, descripcion: string): Promise<SolicitudContacto>;
  listar(filtro: FiltroSolicitudes): Promise<PaginaSolicitudes>;
  obtener(idSolicitud: string): Promise<SolicitudContacto | null>;
  obtenerDetalle(idSolicitud: string): Promise<SolicitudContactoDetalle | null>;
  agregarMensaje(
    idSolicitud: string,
    idAutor: number,
    rolAutor: RolAutorMensaje,
    contenido: string,
  ): Promise<MensajeSolicitudContacto>;
  cambiarEstado(idSolicitud: string, estado: EstadoSolicitudContacto): Promise<SolicitudContacto>;
  calificar(
    idSolicitud: string,
    calificacion: CalificacionAtencion,
    fechaCalificacion: Date,
  ): Promise<SolicitudContacto>;
  /** R6: cuántas solicitudes lleva el usuario desde `desde`. */
  contarDesde(idUsuario: number, desde: Date): Promise<number>;
}

export interface ConfiguracionAtencionRepositoryPort {
  /** Las 7 franjas, ordenadas de lunes a domingo. */
  obtenerHorario(): Promise<FranjaHorario[]>;
  /** Reemplaza la semana completa en una transacción. */
  reemplazarHorario(franjas: FranjaHorario[], idAdmin?: number): Promise<FranjaHorario[]>;
  obtenerWhatsapp(): Promise<ConfiguracionWhatsapp | null>;
  guardarWhatsapp(
    destino: string,
    mensajeBase: string | null,
    idAdmin?: number,
  ): Promise<ConfiguracionWhatsapp>;
}