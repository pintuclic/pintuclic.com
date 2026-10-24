import type { EstadoCuentaCliente, TipoCuentaCliente } from '../dtos/m17-permisos.dto';

export interface EntidadClienteAdmin {
  idUsuario: number;
  nombre: string;
  correo: string;
  telefono: string | null;
  tipo: TipoCuentaCliente;
  estado: EstadoCuentaCliente;
  fechaCreacion: Date;
}

export interface FiltrosBusquedaClientes {
  termino?: string | undefined;
  tipo?: 'todos' | 'normal' | 'empresa';
  pagina: number;
  limite: number;
}

export interface ResumenOrdenDominio {
  idOrden: number;
  codigoVisible: string;
  fecha: Date;
  estado: string;
  total: number;
}

export interface ResumenCotizacionDominio {
  idCotizacion: number;
  fecha: Date;
  estado: string;
  total: number;
}

export interface ClientesAdminRepositoryPort {
  buscar(filtros: FiltrosBusquedaClientes): Promise<{ clientes: EntidadClienteAdmin[]; total: number }>;
  obtenerPorId(idUsuario: number): Promise<EntidadClienteAdmin | null>;
  desactivar(idUsuario: number, motivo: string): Promise<void>;
  obtenerOrdenesRecientes(idUsuario: number, limite?: number): Promise<ResumenOrdenDominio[]>;
  obtenerCotizacionesRecientes(idUsuario: number, limite?: number): Promise<ResumenCotizacionDominio[]>;
}
