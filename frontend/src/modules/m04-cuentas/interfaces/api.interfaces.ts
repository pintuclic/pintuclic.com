import type {
  EstadoSolicitudEmpresa,
  EstadoUsuario,
  TipoSolicitudEmpresa,
  TipoUsuario,
} from '../dtos/m04-cuentas.dto';

/**
 * Formas de las respuestas REALES de la API de M04 (backend v0.4.2), tomadas de
 * los controladores. Solo tipos: cero runtime (Directiva #10).
 */

export interface UsuarioResumen {
  idUsuario: number;
  nombre: string;
  correo: string;
  tipo: TipoUsuario;
  esAdmin?: boolean;
}

/** POST /cuentas/registro y /registro/reenviar-otp */
export interface RegistroIniciado {
  idVerificacion: string;
  correo: string;
  tiempoExpiracionSegundos: number;
}

/** POST /cuentas/login: sesión abierta o primer acceso con cambio de clave obligatorio. */
export type ResultadoLogin =
  | { tipo: 'sesion'; usuario: UsuarioResumen }
  | { tipo: 'cambio_obligatorio'; tokenCambio: string };

export interface EmpresaAprobada {
  nit: string;
  nombreEmpresa: string;
  nombreRepresentante: string;
  correoEmpresarial: string;
  telefono: string;
  fechaAprobacion: string;
}

/** GET /cuentas/perfil */
export interface PerfilUsuario {
  idUsuario: number;
  nombre: string;
  correo: string;
  telefono: string | null;
  tipo: TipoUsuario;
  esAdmin?: boolean;
  estado: EstadoUsuario;
  cambioContrasenaPendiente: boolean;
  empresa?: EmpresaAprobada | null;
}

/** GET /cuentas/direcciones */
export interface Direccion {
  idDireccion: string;
  direccion: string;
  barrio: string;
  apartamentoCasa?: string | null;
  nombreApellido: string;
  telefono: string;
  esPredeterminada: boolean;
  latitud?: number | null;
  longitud?: number | null;
}

/** POST /cuentas/perfil/cambio-correo/solicitar */
export interface CambioCorreoIniciado {
  idVerificacion: string;
  nuevoCorreo: string;
  tiempoExpiracionSegundos: number;
}

/** GET /cuentas/empresas/solicitudes/mias */
export interface MisSolicitudes {
  solicitudEmpresa: {
    idSolicitud: string;
    tipoSolicitud: TipoSolicitudEmpresa;
    estado: EstadoSolicitudEmpresa;
    motivoRechazo: string | null;
    fechaSolicitud: string;
    fechaRevision: string | null;
  } | null;
  renovacionNit: {
    idSolicitud: string;
    nitVigente: string;
    nitSolicitado: string;
    estado: EstadoSolicitudEmpresa;
    motivoRechazo: string | null;
    fechaSolicitud: string;
    fechaRevision: string | null;
  } | null;
}

/* ─── Panel administrativo (empresas.validar) ─── */

export interface SolicitudEmpresaAdmin {
  idSolicitud: string;
  idUsuario: number;
  nombreEmpresa: string;
  nombreRepresentante: string;
  correoEmpresarial: string;
  telefono: string;
  nit: string;
  tipoSolicitud: TipoSolicitudEmpresa;
  estado: EstadoSolicitudEmpresa;
  motivoRechazo?: string | null;
  fechaSolicitud: string;
  fechaRevision?: string | null;
}

export interface DocumentoRutMeta {
  idDocumento: string;
  nombreOriginal: string;
  tipoMime: string;
  tamanoBytes: number;
  fechaCarga?: string;
}

export interface RenovacionNitAdmin {
  idSolicitud: string;
  idUsuario: number;
  nitAnterior: string;
  nitNuevo: string;
  idDocumento: string | null;
  estado: EstadoSolicitudEmpresa;
  motivoRechazo?: string | null;
  fechaSolicitud: string;
  fechaRevision?: string | null;
  documento?: DocumentoRutMeta | null;
}

export interface ListaPaginada<T> {
  items: T[];
  total: number;
}

export interface FiltroSolicitudes {
  estado?: EstadoSolicitudEmpresa;
  page?: number;
  limit?: number;
}
