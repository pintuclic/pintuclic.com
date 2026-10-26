/**
 * Tipos de la API de M15. Espejo de `contracts/m15-atencion.contract.ts`.
 * Solo tipos, cero runtime.
 */

export type TipoSolicitudContacto = 'consulta' | 'cotizacion' | 'reclamo';
export type EstadoSolicitudContacto = 'en_revision' | 'atendida' | 'rechazada';
export type RolAutorMensaje = 'cliente' | 'equipo';
export type CalificacionAtencion = 1 | 2 | 3 | 4 | 5;
export type DiaSemana =
  | 'lunes'
  | 'martes'
  | 'miercoles'
  | 'jueves'
  | 'viernes'
  | 'sabado'
  | 'domingo';

export interface RemitenteSolicitud {
  nombre: string;
  correo: string;
  telefono: string | null;
}

export interface MensajeSolicitudContacto {
  idMensaje: string;
  idSolicitud: string;
  idAutor: number;
  rolAutor: RolAutorMensaje;
  nombreAutor: string;
  contenido: string;
  fechaCreacion: string;
}

export interface SolicitudContacto {
  idSolicitud: string;
  idUsuario: number;
  remitente: RemitenteSolicitud;
  tipo: TipoSolicitudContacto;
  descripcion: string;
  estado: EstadoSolicitudContacto;
  calificacion: CalificacionAtencion | null;
  fechaCalificacion: string | null;
  totalMensajes: number;
  fechaCreacion: string;
}

export interface SolicitudContactoDetalle extends SolicitudContacto {
  mensajes: MensajeSolicitudContacto[];
}

export interface ConfirmacionContacto {
  solicitud: SolicitudContacto;
  /** Null dentro del horario; el aviso cuando la solicitud llega fuera de él. */
  avisoHorario: string | null;
  /** True en una cotización: el camino formal es el carrito. */
  remitirAlCarrito: boolean;
}

export interface FranjaHorario {
  diaSemana: DiaSemana;
  abierto: boolean;
  horaInicio: string | null;
  horaFin: string | null;
}

export interface HorarioAtencion {
  franjas: FranjaHorario[];
  abiertoAhora: boolean;
}

export interface CanalWhatsappPublico {
  destino: string;
  mensajeBase: string | null;
  /** True cuando el destino ya es una URL completa y se abre tal cual. */
  destinoEsUrl: boolean;
}

export interface ConfiguracionWhatsapp {
  destino: string;
  mensajeBase: string | null;
  fechaActualizacion: string;
}

export interface Paginacion {
  pagina: number;
  limite: number;
  total: number;
  totalPaginas: number;
}

export interface PaginaSolicitudes {
  items: SolicitudContacto[];
  pagination: Paginacion;
}