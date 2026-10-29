import { apiClient } from '@/core/api/apiClient';
import type { RespuestaExitosa } from '@/core/types/respuesta-api.type';
import type { Comprobante, DatosFacturacion, EditarDatosFacturacionRequest } from '../dtos/m12-facturacion.dto';

/** El cliente titular ve el comprobante de SUS pedidos (se emite al primer GET si todavía no existía). */
export async function obtenerMiComprobante(codigoOrden: string): Promise<Comprobante> {
  const { data } = await apiClient.get<RespuestaExitosa<Comprobante>>(`/facturacion/mis-comprobantes/${encodeURIComponent(codigoOrden)}`);
  return data.data;
}

/** Personal con `ventas.ver`: el comprobante de cualquier orden. */
export async function obtenerComprobanteDePersonal(codigoOrden: string): Promise<Comprobante> {
  const { data } = await apiClient.get<RespuestaExitosa<Comprobante>>(`/facturacion/gestion/${encodeURIComponent(codigoOrden)}`);
  return data.data;
}

/** Personal con `ventas.gestionar`: vuelve a avisar al cliente por correo. */
export async function reenviarComprobante(codigoOrden: string): Promise<void> {
  await apiClient.post(`/facturacion/gestion/${encodeURIComponent(codigoOrden)}/reenviar`);
}

export async function obtenerDatosFacturacion(): Promise<DatosFacturacion> {
  const { data } = await apiClient.get<RespuestaExitosa<DatosFacturacion>>('/admin/facturacion/datos');
  return data.data;
}

export async function guardarDatosFacturacion(datos: EditarDatosFacturacionRequest): Promise<DatosFacturacion> {
  const { data } = await apiClient.put<RespuestaExitosa<DatosFacturacion>>('/admin/facturacion/datos', datos);
  return data.data;
}
