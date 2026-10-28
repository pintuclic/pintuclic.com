import { apiClient } from '@/core/api/apiClient';
import type { RespuestaExitosa } from '@/core/types/respuesta-api.type';
import { resumenPanelSchema, type ResumenPanel } from '../dtos/m17-panel-resumen.dto';

/** Pide el resumen del panel (contrato M17 · resumen). El periodo es de 7, 30 o 90 días. */
export async function obtenerResumenPanel(dias: 7 | 30 | 90): Promise<ResumenPanel> {
  const { data } = await apiClient.get<RespuestaExitosa<ResumenPanel>>('/admin/resumen', { params: { dias } });
  // Se valida lo que llega: un cambio de la API se nota aquí y no en un gráfico en blanco.
  return resumenPanelSchema.parse(data.data);
}
