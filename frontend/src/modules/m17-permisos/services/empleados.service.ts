import { apiClient } from '@/core/api/apiClient';
import type { RespuestaExitosa } from '@/core/types/respuesta-api.type';
import type {
  CrearEmpleadoFormData,
  EditarEmpleadoFormData,
} from '../dtos/empleados.dto';
import type {
  CrearEmpleadoRespuesta,
  DetalleEmpleado,
  ListarEmpleadosQuery,
  ListarEmpleadosRespuesta,
} from '../interfaces/empleados.interface';

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
 * HU-ADM-01: Crear colaborador. El backend le envía por correo el enlace para
 * definir su contraseña; ninguna clave pasa por el panel.
 */
export async function crearEmpleado(payload: CrearEmpleadoFormData): Promise<CrearEmpleadoRespuesta> {
  const { data } = await apiClient.post<RespuestaExitosa<CrearEmpleadoRespuesta>>('/admin/empleados', payload);
  return data.data;
}

/**
 * HU-ADM-01: Enviar un enlace de activación nuevo (invalida los anteriores).
 */
export async function reenviarActivacionEmpleado(idUsuario: number): Promise<void> {
  await apiClient.post(`/admin/empleados/${idUsuario}/reenviar-activacion`, {});
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
