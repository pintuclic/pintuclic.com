import type { EstadoCuentaEmpleado } from '../dtos/m17-permisos.dto';

export interface EntidadEmpleado {
  idUsuario: number;
  nombre: string;
  correo: string;
  telefono: string | null;
  estado: EstadoCuentaEmpleado;
  idRol: number | null;
  fechaCreacion: Date;
  fechaUltimoAcceso: Date | null;
}

export interface FiltrosListadoEmpleados {
  estado?: EstadoCuentaEmpleado | undefined;
  busqueda?: string | undefined;
  pagina: number;
  limite: number;
}

export interface EmpleadosRepositoryPort {
  listar(filtros: FiltrosListadoEmpleados): Promise<{ empleados: EntidadEmpleado[]; total: number }>;
  obtenerPorId(idUsuario: number): Promise<EntidadEmpleado | null>;
  obtenerPorCorreo(correo: string): Promise<EntidadEmpleado | null>;
  crear(datos: {
    nombre: string;
    correo: string;
    telefono: string;
    contrasenaHash: string;
  }): Promise<EntidadEmpleado>;
  actualizarContacto(
    idUsuario: number,
    datos: { nombre?: string | undefined; telefono?: string | undefined },
  ): Promise<EntidadEmpleado>;
  actualizarEstado(idUsuario: number, nuevoEstado: EstadoCuentaEmpleado): Promise<void>;
  contarPermisos(idUsuario: number): Promise<number>;
}
