import { apiClient } from '@/core/api/apiClient';
import type { RespuestaExitosa } from '@/core/types/respuesta-api.type';
import type {
  BuscarClientesQuery,
  BuscarClientesRespuesta,
  FichaClienteRespuesta,
} from '../interfaces/clientes-admin.interface';

export interface DesactivarClienteResultado {
  mensaje: string;
  idCliente: number;
  estado: string;
}

/**
 * HU-ADM-05: Búsqueda y listado de clientes en el panel de administración.
 */
export async function buscarClientes(
  query: BuscarClientesQuery = {},
): Promise<BuscarClientesRespuesta> {
  const { data } = await apiClient.get<RespuestaExitosa<BuscarClientesRespuesta>>(
    '/admin/clientes',
    { params: query },
  );
  return data.data;
}

/**
 * HU-ADM-05: Obtener ficha completa de cliente (perfil, pedidos y cotizaciones).
 */
export async function obtenerFichaCliente(
  idCliente: number,
): Promise<FichaClienteRespuesta> {
  const { data } = await apiClient.get<RespuestaExitosa<FichaClienteRespuesta>>(
    `/admin/clientes/${idCliente}`,
  );
  return data.data;
}

/**
 * HU-ADM-05 / RN-ADM-08: Desactivar cliente con motivo obligatorio (solo administrador).
 */
export async function desactivarCliente(
  idCliente: number,
  motivo: string,
): Promise<DesactivarClienteResultado> {
  const { data } = await apiClient.post<RespuestaExitosa<DesactivarClienteResultado>>(
    `/admin/clientes/${idCliente}/desactivar`,
    { motivo },
  );
  return data.data;
}
