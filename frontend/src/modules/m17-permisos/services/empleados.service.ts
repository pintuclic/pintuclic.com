import { apiClient } from '@/core/api/apiClient';
import type { RespuestaExitosa } from '@/core/types/respuesta-api.type';
import type {
  CrearEmpleadoFormData,
  EditarEmpleadoFormData,
} from '../dtos/empleados.dto';
import type {
  DetalleEmpleado,
  ListarEmpleadosQuery,
  ListarEmpleadosRespuesta,
} from '../interfaces/empleados.interface';

export interface CrearEmpleadoResultado {
  empleado: DetalleEmpleado;
  credencialTemporalGenerada?: string;
}

/**
 * HU-ADM-01 / HU-ADM-03: Listar colaboradores del sistema.
 */
export async function listarEmpleados(
  filtros: ListarEmpleadosQuery = {},
): Promise<ListarEmpleadosRespuesta> {
  const { data } = await apiClient.get<RespuestaExitosa<ListarEmpleadosRespuesta>>(
    '/admin/empleados',
    { params: filtros },
  );
  return data.data;
}

/**
 * HU-ADM-01: Obtener detalle individual de colaborador.
 */
export async function obtenerEmpleado(idUsuario: number): Promise<DetalleEmpleado> {
  const { data } = await apiClient.get<RespuestaExitosa<DetalleEmpleado>>(
    `/admin/empleados/${idUsuario}`,
  );
  return data.data;
}

/**
 * HU-ADM-01: Crear nuevo colaborador con credencial temporal generada.
 */
export async function crearEmpleado(
  payload: CrearEmpleadoFormData,
): Promise<CrearEmpleadoResultado> {
  const respuesta = await apiClient.post<
    RespuestaExitosa<DetalleEmpleado> & { meta?: { credencialTemporalGenerada?: string } }
  >('/admin/empleados', payload);

  return {
    empleado: respuesta.data.data,
    credencialTemporalGenerada: respuesta.data.meta?.credencialTemporalGenerada,
  };
}

/**
 * HU-ADM-01: Editar datos básicos de colaborador.
 */
export async function editarEmpleado(
  idUsuario: number,
  payload: EditarEmpleadoFormData,
): Promise<DetalleEmpleado> {
  const { data } = await apiClient.patch<RespuestaExitosa<DetalleEmpleado>>(
    `/admin/empleados/${idUsuario}`,
    payload,
  );
  return data.data;
}

/**
 * HU-ADM-04: Desactivación inmediata con revocación de sesión en tiempo real.
 */
export async function desactivarEmpleado(idUsuario: number): Promise<DetalleEmpleado> {
  const { data } = await apiClient.post<RespuestaExitosa<DetalleEmpleado>>(
    `/admin/empleados/${idUsuario}/desactivar`,
    {},
  );
  return data.data;
}

/**
 * HU-ADM-04: Reactivación de colaborador previamente desactivado.
 */
export async function reactivarEmpleado(idUsuario: number): Promise<DetalleEmpleado> {
  const { data } = await apiClient.post<RespuestaExitosa<DetalleEmpleado>>(
    `/admin/empleados/${idUsuario}/reactivar`,
    {},
  );
  return data.data;
}
