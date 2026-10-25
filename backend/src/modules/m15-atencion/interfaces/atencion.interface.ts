import type {
  ConfiguracionWhatsapp,
  CrearFaqRequest,
  EditarFaqRequest,
  EstadoSolicitudContacto,
  FranjaHorario,
  PreguntaFrecuente,
  SolicitudContacto,
  TipoSolicitudContacto,
} from '../dtos/m15-atencion.dto';

/**
 * Puertos de persistencia de M15. Solo tipos, cero runtime (AGENTS.md).
 */

export interface FiltroFaqsAdmin {
  tema?: string;
  incluirInactivas: boolean;
  pagina: number;
  limite: number;
}

export interface PaginaFaqs {
  items: PreguntaFrecuente[];
  total: number;
}

export interface FaqsRepositoryPort {
  /** Solo activas, agrupadas por tema y ordenadas (R1, R2). */
  listarPublicas(): Promise<PreguntaFrecuente[]>;
  listarAdmin(filtro: FiltroFaqsAdmin): Promise<PaginaFaqs>;
  obtener(idPregunta: number): Promise<PreguntaFrecuente | null>;
  crear(datos: CrearFaqRequest): Promise<PreguntaFrecuente>;
  actualizar(idPregunta: number, datos: EditarFaqRequest): Promise<PreguntaFrecuente>;
  cambiarActiva(idPregunta: number, activa: boolean): Promise<PreguntaFrecuente>;
  eliminar(idPregunta: number): Promise<void>;
  /** Ids del tema, para validar un reordenamiento completo. */
  idsDelTema(tema: string): Promise<number[]>;
  /** Fija el `orden` de cada id según su posición en la lista, en una transacción. */
  reordenar(ordenIds: number[]): Promise<void>;
}

export interface FiltroSolicitudes {
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
  marcarAtendida(idSolicitud: string): Promise<SolicitudContacto>;
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
