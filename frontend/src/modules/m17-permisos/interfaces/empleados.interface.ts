/**
 * ==============================================================================
 * Contratos de Tipado para Empleados / Colaboradores — M17 (Frontend)
 * ==============================================================================
 * CERO RUNTIME. Solo definiciones de TypeScript.
 */

export type EstadoCuentaEmpleado = 'activo' | 'inactivo';

export interface ResumenEmpleado {
  idUsuario: number;
  nombre: string;
  correo: string;
  telefono: string | null;
  estado: EstadoCuentaEmpleado;
  fechaCreacion: string;
  fechaUltimoAcceso: string | null;
  cantidadPermisos: number;
}

export interface DetalleEmpleado {
  idUsuario: number;
  nombre: string;
  correo: string;
  telefono: string | null;
  estado: EstadoCuentaEmpleado;
  primerAccesoPendiente: boolean;
  fechaCreacion: string;
}

export interface ListarEmpleadosQuery {
  estado?: EstadoCuentaEmpleado;
  busqueda?: string;
  pagina?: number;
  limite?: number;
}

export interface ListarEmpleadosRespuesta {
  empleados: ResumenEmpleado[];
  total: number;
  pagina: number;
  totalPaginas: number;
}

export interface CrearEmpleadoRespuesta {
  idUsuario: number;
  nombre: string;
  correo: string;
  telefono: string | null;
  estado: EstadoCuentaEmpleado;
  primerAccesoPendiente: boolean;
  fechaCreacion: string;
}
