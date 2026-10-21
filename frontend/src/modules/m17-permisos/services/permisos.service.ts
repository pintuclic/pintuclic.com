import { apiClient } from '@/core/api/apiClient';
import type { RespuestaExitosa } from '@/core/types/respuesta-api.type';
import type { CodigoPermiso } from '../dtos/permisos.dto';
import type {
  ActualizarPermisosRespuesta,
  FichaPermisosEmpleadoRespuesta,
} from '../interfaces/permisos.interface';

/**
 * HU-ADM-02: Obtener matriz completa de 20 permisos atómicos para un colaborador.
 */
export async function obtenerMatrizPermisos(
  idUsuario: number,
): Promise<FichaPermisosEmpleadoRespuesta> {
  const { data } = await apiClient.get<RespuestaExitosa<FichaPermisosEmpleadoRespuesta>>(
    `/admin/empleados/${idUsuario}/permisos`,
  );
  return data.data;
}

/**
 * HU-ADM-02: Actualizar individualmente los permisos atómicos concedidos a un colaborador.
 */
export async function actualizarPermisos(
  idUsuario: number,
  permisos: CodigoPermiso[],
): Promise<ActualizarPermisosRespuesta> {
  const { data } = await apiClient.put<RespuestaExitosa<ActualizarPermisosRespuesta>>(
    `/admin/empleados/${idUsuario}/permisos`,
    { permisos },
  );
  return data.data;
}
