/**
 * ==============================================================================
 * Contratos de Tipado para Gestión Administrativa de Clientes — M17 (Frontend)
 * ==============================================================================
 * CERO RUNTIME. Solo definiciones de TypeScript.
 */

export type TipoCuentaCliente = 'normal' | 'empresa';
export type EstadoCuentaCliente = 'activo' | 'inactivo' | 'bloqueado' | 'pendiente';

export interface ResumenOrdenCliente {
  idOrden: number;
  codigoVisible: string;
  fecha: string;
  estado: string;
  total: number;
}

export interface ResumenCotizacionCliente {
  idCotizacion: number;
  fecha: string;
  estado: string;
  total: number;
}

export interface ClienteResumen {
  idUsuario: number;
  nombre: string;
  correo: string;
  telefono: string | null;
  tipo: TipoCuentaCliente;
  estado: EstadoCuentaCliente;
  fechaRegistro: string;
}

export interface FichaClienteRespuesta {
  idUsuario: number;
  nombre: string;
  correo: string;
  telefono: string | null;
  tipo: TipoCuentaCliente;
  estado: EstadoCuentaCliente;
  fechaRegistro: string;
  ordenesRecientes: ResumenOrdenCliente[];
  cotizacionesRecientes: ResumenCotizacionCliente[];
}

export interface BuscarClientesQuery {
  termino?: string;
  tipo?: 'todos' | 'normal' | 'empresa';
  pagina?: number;
  limite?: number;
}

export interface BuscarClientesRespuesta {
  clientes: ClienteResumen[];
  total: number;
  pagina: number;
  totalPaginas: number;
}
