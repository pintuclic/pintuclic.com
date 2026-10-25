/**
 * Tipos de la API de M15. Espejo de `contracts/m15-atencion.contract.ts`.
 * Solo tipos, cero runtime.
 */

export type TipoSolicitudContacto = 'consulta' | 'cotizacion' | 'reclamo';
export type EstadoSolicitudContacto = 'pendiente' | 'atendida';
export type DiaSemana =
  | 'lunes'
  | 'martes'
  | 'miercoles'
  | 'jueves'
  | 'viernes'
  | 'sabado'
  | 'domingo';

export interface PreguntaFrecuentePublica {
  idPregunta: number;
  tema: string;
  pregunta: string;
  respuesta: string;
  orden: number;
}

export interface PreguntaFrecuente extends PreguntaFrecuentePublica {
  activa: boolean;
  fechaCreacion: string;
  fechaActualizacion: string;
}

export interface RemitenteSolicitud {
  nombre: string;
  correo: string;
  telefono: string | null;
}

export interface SolicitudContacto {
  idSolicitud: string;
  idUsuario: number;
  remitente: RemitenteSolicitud;
  tipo: TipoSolicitudContacto;
  descripcion: string;
  estado: EstadoSolicitudContacto;
  fechaCreacion: string;
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

export interface PaginaFaqs {
  items: PreguntaFrecuente[];
  pagination: Paginacion;
}

export interface PaginaSolicitudes {
  items: SolicitudContacto[];
  pagination: Paginacion;
}
