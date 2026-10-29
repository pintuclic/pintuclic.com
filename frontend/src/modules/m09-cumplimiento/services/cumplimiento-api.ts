import { apiClient } from '@/core/api/apiClient';
import {
  hojaResponseEnvelopeSchema,
  retenidasResponseEnvelopeSchema,
  verificacionResponseEnvelopeSchema,
  verificarLineasResponseEnvelopeSchema,
  type HojaPreparacion,
  type LineaVerificadaInput,
  type OrdenRetenida,
  type Paginacion,
  type VerificacionOrden,
} from '../dtos/m09-cumplimiento.dto';

export interface RetenidasRespuesta {
  filas: OrdenRetenida[];
  paginacion: Paginacion;
}

export interface ResultadoMarcado {
  verificacion: VerificacionOrden;
  /** true = esta petición movió el pedido a preparación (R7). */
  avanzo: boolean;
}

const BASE = '/cumplimiento';

/** HU-CUM-01 · La lista de chequeo de un pedido con el rastro de cada línea. */
export async function obtenerVerificacion(codigo: string): Promise<VerificacionOrden> {
  const { data } = await apiClient.get<unknown>(`${BASE}/ordenes/${encodeURIComponent(codigo)}/verificacion`);
  return verificacionResponseEnvelopeSchema.parse(data).data;
}

/** HU-CUM-01 y HU-CUM-03 · Marca una o varias líneas; si todas quedan disponibles el pedido pasa a preparación. */
export async function marcarLineas(codigo: string, lineas: readonly LineaVerificadaInput[]): Promise<ResultadoMarcado> {
  const { data } = await apiClient.put<unknown>(`${BASE}/ordenes/${encodeURIComponent(codigo)}/verificacion`, { lineas });
  return verificarLineasResponseEnvelopeSchema.parse(data).data;
}

/** HU-CUM-03 · Pedidos detenidos en la revisión y por qué. */
export async function listarRetenidas(pagina = 1, limite = 20): Promise<RetenidasRespuesta> {
  const { data } = await apiClient.get<unknown>(`${BASE}/retenidas`, { params: { pagina, limite } });
  const cuerpo = retenidasResponseEnvelopeSchema.parse(data);
  return { filas: cuerpo.data, paginacion: cuerpo.pagination };
}

/** HU-CUM-06 · Datos de la hoja de preparación. */
export async function obtenerHoja(codigo: string): Promise<HojaPreparacion> {
  const { data } = await apiClient.get<unknown>(`${BASE}/ordenes/${encodeURIComponent(codigo)}/hoja`);
  return hojaResponseEnvelopeSchema.parse(data).data;
}
