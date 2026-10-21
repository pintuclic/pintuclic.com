import type { AreaFuncional } from '../dtos/m17-permisos.dto';

export interface EntidadPermiso {
  idPermiso: number;
  nombre: string;
  descripcion: string | null;
  area: AreaFuncional;
}

export interface PermisosRepositoryPort {
  listarCatalogo(): Promise<EntidadPermiso[]>;
  obtenerPermisosUsuario(idUsuario: number): Promise<string[]>;
  tienePermiso(idUsuario: number, codigoPermiso: string): Promise<boolean>;
  asignarPermisos(idUsuario: number, codigosPermiso: string[]): Promise<void>;
  asegurarRolEmpleado(idUsuario: number, nombreEmpleado: string): Promise<number>;
}
