import type {
  TipoUsuario,
  EstadoUsuario,
  TipoSolicitudEmpresa,
  EstadoSolicitudEmpresa,
} from '../dtos/m04-cuentas.dto';

/**
 * ============================================================================
 * INTERFACES DE DOMINIO FRONTEND — M04. Cuentas, Autenticación y Perfil
 * ============================================================================
 * Tipos estáticos puros para vistas y componentes React.
 * ============================================================================
 */

export interface UsuarioSessionState {
  idUsuario: number;
  nombre: string;
  correo: string;
  tipo: TipoUsuario;
  estado: EstadoUsuario;
  cambioContrasenaPendiente: boolean;
  empresa?: {
    nit: string;
    nombreEmpresa: string;
    nombreRepresentante: string;
    correoEmpresarial: string;
    telefono: string;
    fechaAprobacion: string;
    tipoCliente?: { nombre: string; porcentaje: number; montoMinimoCompra: number } | null;
  } | null;
}

export interface DireccionClienteUI {
  idDireccion: string;
  idUsuario: number;
  direccion: string;
  barrio: string;
  apartamentoCasa?: string | null;
  municipio?: string | null;
  departamento?: string | null;
  nombreApellido: string;
  telefono: string;
  esPredeterminada: boolean;
  latitud?: number | null;
  longitud?: number | null;
}

export interface SolicitudEmpresaUI {
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

export interface SolicitudActualizacionNitUI {
  idSolicitud: string;
  idUsuario: number;
  nitAnterior: string;
  nitNuevo: string;
  idDocumento?: string | null;
  estado: EstadoSolicitudEmpresa;
  motivoRechazo?: string | null;
  fechaSolicitud: string;
  fechaRevision?: string | null;
}
