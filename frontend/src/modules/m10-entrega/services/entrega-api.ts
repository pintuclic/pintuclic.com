import { isAxiosError } from 'axios';
import { apiClient } from '@/core/api/apiClient';
import {
  envioClienteResponseEnvelopeSchema,
  envioOrdenResponseEnvelopeSchema,
  envioPersonalResponseEnvelopeSchema,
  type EnvioCliente,
  type EnvioDetallePersonal,
  type EnvioOrden,
} from '../dtos/m10-entrega.dto';

const codigo = (c: string): string => encodeURIComponent(c);

/** R5: el envío de MI pedido. Null si el pedido aún no tiene envío (el servidor responde 404). */
export async function obtenerEnvioCliente(codigoOrden: string): Promise<EnvioCliente | null> {
  try {
    const { data } = await apiClient.get<unknown>(`/ordenes/mis-pedidos/${codigo(codigoOrden)}/envio`);
    return envioClienteResponseEnvelopeSchema.parse(data).data;
  } catch (error: unknown) {
    if (isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
}

export async function obtenerEnvioPersonal(codigoOrden: string): Promise<EnvioDetallePersonal> {
  const { data } = await apiClient.get<unknown>(`/ordenes/gestion/${codigo(codigoOrden)}/envio`);
  return envioPersonalResponseEnvelopeSchema.parse(data).data;
}

export async function reintentarEnvio(codigoOrden: string): Promise<EnvioOrden> {
  const { data } = await apiClient.post<unknown>(`/ordenes/gestion/${codigo(codigoOrden)}/envio/reintentar`);
  return envioOrdenResponseEnvelopeSchema.parse(data).data;
}
