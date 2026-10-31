import type { AreaFuncional } from '../dtos/m17-permisos.dto';

export interface EntidadPermiso {
  idPermiso: number;
  nombre: string;
  descripcion: string | null;
  area: AreaFuncional;
}

/** Permisos individuales (usuario_permiso, M17 R-ACC-3). Nunca toca `asignacion_permiso` ni roles. */
export interface PermisosRepositoryPort {
  listarCatalogo(): Promise<EntidadPermiso[]>;
  /** Códigos activos concedidos a la persona; vacío si no es un empleado activo (R-ACC-5). */
  obtenerPermisosUsuario(idUsuario: number): Promise<string[]>;
  /** true solo si es un empleado activo con la fila en usuario_permiso y el permiso está activo (R-ACC-5). */
  tienePermiso(idUsuario: number, codigoPermiso: string): Promise<boolean>;
  /** Reemplaza los permisos de un EMPLEADO. Lanza si la cuenta no tiene rol empleado. */
  asignarPermisos(idUsuario: number, codigosPermiso: string[]): Promise<void>;
}
