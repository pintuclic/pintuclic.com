import type {
  TipoUsuario,
  EstadoUsuario,
  TipoSolicitudEmpresa,
  EstadoSolicitudEmpresa,
} from '../dtos/m04-cuentas.dto';

/**
 * ============================================================================
 * INTERFACES ESTÁTICAS DE DOMINIO — M04. Cuentas, Autenticación y Perfil
 * ============================================================================
 * Contratos de compilación puros. Cero código ejecutable, cero dependencias runtime.
 * Directiva #10: Cero datos mock o auto-siembra.
 * ============================================================================
 */

export interface EntidadUsuario {
  idUsuario: number;
  nombre: string;
  telefono: string | null;
  correo: string;
  contrasena: string;
  idRol: number | null;
  estado: EstadoUsuario;
  tipo: TipoUsuario;
  cambioContrasenaPendiente: boolean;
}

export interface EntidadCuentaEmpresa {
  idUsuario: number;
  nit: string;
  nombreEmpresa: string;
  nombreRepresentante: string;
  correoEmpresarial: string;
  telefono: string;
  idSolicitudOrigen: string | null;
  fechaAprobacion: Date;
  fechaActualizacion: Date;
}

export interface EntidadDireccionCliente {
  idDireccion: string;
  idUsuario: number;
  direccion: string;
  barrio: string;
  apartamentoCasa: string | null;
  nombreApellido: string;
  telefono: string;
  esPredeterminada: boolean;
  latitud: number | null;
  longitud: number | null;
  fechaCreacion: Date;
  fechaActualizacion: Date;
}

export interface EntidadSolicitudEmpresa {
  idSolicitud: string;
  idUsuario: number;
  nombreEmpresa: string;
  nombreRepresentante: string;
  correoEmpresarial: string;
  telefono: string;
  nit: string;
  tipoSolicitud: TipoSolicitudEmpresa;
  estado: EstadoSolicitudEmpresa;
  motivoRechazo: string | null;
  idAdminRevisor: number | null;
  fechaSolicitud: Date;
  fechaRevision: Date | null;
}

export interface EntidadDocumentoSoporte {
  idDocumento: string;
  nombreOriginal: string;
  tipoMime: string;
  tamanoBytes: number;
  sha256: string;
  contenido: Buffer;
  fechaCarga: Date;
}

export interface EntidadSolicitudActualizacionNit {
  idSolicitud: string;
  idUsuario: number;
  nitAnterior: string;
  nitNuevo: string;
  idDocumento: string | null;
  estado: EstadoSolicitudEmpresa;
  motivoRechazo: string | null;
  idAdminRevisor: number | null;
  fechaSolicitud: Date;
  fechaRevision: Date | null;
}

export interface EntidadCodigoVerificacion {
  idCodigo: string;
  correo: string;
  codigoHash: string;
  tipo: 'registro' | 'recuperacion_password' | 'cambio_correo';
  expiracion: Date;
  intentos: number;
  maxIntentos: number;
  datosTemporales: Record<string, unknown> | null;
  fechaCreacion: Date;
}

export interface EntidadControlIntentoAcceso {
  correo: string;
  intentosFallidos: number;
  bloqueadoHasta: Date | null;
  fechaUltimoIntento: Date;
}

export interface EntidadUsuarioIdentidadExterna {
  idIdentidad: number;
  idUsuario: number;
  proveedor: string;
  idProveedor: string;
  correoProveedor: string | null;
  fechaVinculacion: Date;
}

/**
 * Vista que el cliente tiene de SUS solicitudes (HU-CUE-03 E6, HU-CUE-10 E3).
 * Contrato de salida mínimo: sin revisor, sin correo y sin contenido de documentos.
 */
export type EstadoSolicitudVisible = 'pendiente' | 'aprobada' | 'rechazada';

export interface EstadoSolicitudEmpresaPropia {
  idSolicitud: string;
  tipoSolicitud: 'registro' | 'ascenso_particular';
  estado: EstadoSolicitudVisible;
  motivoRechazo: string | null;
  fechaSolicitud: Date;
  fechaRevision: Date | null;
}

export interface EstadoRenovacionNitPropia {
  idSolicitud: string;
  nitVigente: string;
  nitSolicitado: string;
  estado: EstadoSolicitudVisible;
  motivoRechazo: string | null;
  fechaSolicitud: Date;
  fechaRevision: Date | null;
}

export interface MisSolicitudesEmpresa {
  solicitudEmpresa: EstadoSolicitudEmpresaPropia | null;
  renovacionNit: EstadoRenovacionNitPropia | null;
}
