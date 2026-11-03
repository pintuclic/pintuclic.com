import type {
  EventoNotificacion,
  ListaNotificaciones,
  Nivel,
  Notificacion,
  Seccion,
  TipoNotificacionClave,
} from './fp02-notificaciones.dto';

/**
 * Puerto que usa cualquier módulo para avisar (R12). Solo backend, sin ruta HTTP.
 * NUNCA lanza: un fallo al publicar se registra y la operación de origen sigue (R10).
 */
export interface PublicadorNotificacionesPort {
  publicar(evento: EventoNotificacion): Promise<void>;
}

/** Fila cruda tal como sale de la base (sin el texto compuesto). */
export interface FilaNotificacion {
  idNotificacion: string;
  tipo: string;
  nivel: Nivel;
  seccion: Seccion;
  cantidad: number;
  referencias: string[];
  fechaUltima: Date;
  fechaVista: Date | null;
  fechaLectura: Date | null;
}

export interface AgregadoResumen {
  nivel: Nivel;
  seccion: Seccion;
  filas: number;
  cantidad: number;
  sinVer: number;
}

export interface PublicacionFilas {
  idsUsuario: number[];
  tipo: TipoNotificacionClave;
  nivel: Nivel;
  seccion: Seccion;
  claveGrupo: string;
  referencia: string | null;
  ahora: Date;
  /** Los abiertos creados antes de esta fecha ya no admiten sumar (R4). */
  limiteVentana: Date;
}

export interface NotificacionesRepositoryPort {
  /** Destinatarios de un permiso: el personal con la fila en `usuario_permiso` más la cuenta de administrador (R3). */
  destinatariosDePermiso(permiso: string, maximo: number): Promise<number[]>;
  /** Insertar o sumar al aviso abierto, para todos a la vez (R4, R13c). */
  publicar(publicacion: PublicacionFilas): Promise<void>;
  resumen(idUsuario: number): Promise<AgregadoResumen[]>;
  listar(idUsuario: number, pagina: number, limite: number): Promise<{ filas: FilaNotificacion[]; total: number }>;
  marcarVistas(idUsuario: number, ahora: Date): Promise<number>;
  marcarTodasLeidas(idUsuario: number, ahora: Date): Promise<number>;
  marcarSeccionLeida(idUsuario: number, seccion: Seccion, ahora: Date): Promise<number>;
  /** Devuelve la fila si es de la persona (la marca leída si no lo estaba), o `null` si no existe o es ajena. */
  marcarLeida(idUsuario: number, idNotificacion: string, ahora: Date): Promise<FilaNotificacion | null>;
  /** Borra por lotes los leídos vencidos (R8). Devuelve cuántos borró. */
  borrarLeidosVencidos(limite: Date, lote: number): Promise<number>;
  /** Borra por lotes los leídos que sobran por encima del máximo por persona. Devuelve cuántos borró. */
  recortarExcedentes(idsUsuario: number[], maximo: number, lote: number): Promise<number>;
}

export type { ListaNotificaciones, Notificacion };
