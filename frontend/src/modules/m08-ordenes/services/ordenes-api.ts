import { apiClient } from '@/core/api/apiClient';
import {
  bandejaAgrupadaResponseEnvelopeSchema,
  bandejaResponseEnvelopeSchema,
  contactoResponseEnvelopeSchema,
  misPedidosResponseEnvelopeSchema,
  notaResponseEnvelopeSchema,
  ordenClienteResponseEnvelopeSchema,
  ordenGestionResponseEnvelopeSchema,
  resumenGestionResponseEnvelopeSchema,
  type CambiarEstadoRequest,
  type ContactoOrden,
  type CrearContactoRequest,
  type CrearNotaRequest,
  type EstadoOrden,
  type NotaOrden,
  type OrdenDetalleCliente,
  type OrdenDetalleGestion,
  type OrdenFilaBandeja,
  type OrdenResumen,
  type Paginacion,
} from '../dtos/m08-ordenes.dto';
import type { ConsultaMisPedidos, FiltrosBandeja } from '../interfaces/ordenes.interface';

export interface MisPedidosRespuesta {
  enCurso: OrdenResumen[];
  finalizados: OrdenResumen[];
  paginacion: Paginacion;
}

export interface BandejaRespuesta {
  filas: OrdenFilaBandeja[];
  paginacion: Paginacion;
}

export interface GrupoBandeja {
  estado: EstadoOrden;
  ordenes: OrdenFilaBandeja[];
}

const BASE = '/ordenes';

/* ── Cliente titular (HU-ORD-04, HU-ORD-07) ─────────────────────────────── */

export async function listarMisPedidos(consulta: ConsultaMisPedidos = {}): Promise<MisPedidosRespuesta> {
  const { data } = await apiClient.get<unknown>(`${BASE}/mis-pedidos`, { params: consulta });
  const cuerpo = misPedidosResponseEnvelopeSchema.parse(data);
  return { ...cuerpo.data, paginacion: cuerpo.pagination };
}

export async function obtenerMiPedido(codigo: string): Promise<OrdenDetalleCliente> {
  const { data } = await apiClient.get<unknown>(`${BASE}/mis-pedidos/${encodeURIComponent(codigo)}`);
  return ordenClienteResponseEnvelopeSchema.parse(data).data;
}

/* ── Personal (HU-ORD-03, 05, 08, 09, 10, 11) ───────────────────────────── */

export async function listarBandeja(filtros: FiltrosBandeja = {}): Promise<BandejaRespuesta> {
  const { data } = await apiClient.get<unknown>(`${BASE}/gestion`, { params: filtros });
  const cuerpo = bandejaResponseEnvelopeSchema.parse(data);
  return { filas: cuerpo.data, paginacion: cuerpo.pagination };
}

export interface BandejaAgrupadaRespuesta {
  grupos: GrupoBandeja[];
  /** true = hay más pedidos en curso de los que se devuelven (los que más llevan esperando van primero). */
  truncada: boolean;
}

/** Bandeja de las órdenes en curso agrupadas por estado, la más antigua primero (RF-ORD-05-04). */
export async function listarBandejaAgrupada(filtros: FiltrosBandeja = {}): Promise<BandejaAgrupadaRespuesta> {
  const { data } = await apiClient.get<unknown>(`${BASE}/gestion`, {
    params: { ...filtros, agruparPorEstado: 'true' },
  });
  const cuerpo = bandejaAgrupadaResponseEnvelopeSchema.parse(data);
  return { grupos: cuerpo.data, truncada: cuerpo.truncada };
}

export async function obtenerResumenGestion(): Promise<Array<{ estado: EstadoOrden; cantidad: number }>> {
  const { data } = await apiClient.get<unknown>(`${BASE}/gestion/resumen`);
  return resumenGestionResponseEnvelopeSchema.parse(data).data;
}

export async function obtenerDetalleGestion(codigo: string): Promise<OrdenDetalleGestion> {
  const { data } = await apiClient.get<unknown>(`${BASE}/gestion/${encodeURIComponent(codigo)}`);
  return ordenGestionResponseEnvelopeSchema.parse(data).data;
}

export async function listarHistorialCliente(codigo: string, pagina = 1, limite = 20): Promise<BandejaRespuesta> {
  const { data } = await apiClient.get<unknown>(`${BASE}/gestion/${encodeURIComponent(codigo)}/historial-cliente`, {
    params: { pagina, limite },
  });
  const cuerpo = bandejaResponseEnvelopeSchema.parse(data);
  return { filas: cuerpo.data, paginacion: cuerpo.pagination };
}

export async function cambiarEstado(codigo: string, cambio: CambiarEstadoRequest): Promise<OrdenDetalleGestion> {
  const { data } = await apiClient.patch<unknown>(`${BASE}/gestion/${encodeURIComponent(codigo)}/estado`, cambio);
  return ordenGestionResponseEnvelopeSchema.parse(data).data;
}

export async function crearNota(codigo: string, nota: CrearNotaRequest): Promise<NotaOrden> {
  const { data } = await apiClient.post<unknown>(`${BASE}/gestion/${encodeURIComponent(codigo)}/notas`, nota);
  return notaResponseEnvelopeSchema.parse(data).data;
}

export async function crearContacto(codigo: string, contacto: CrearContactoRequest): Promise<ContactoOrden> {
  const { data } = await apiClient.post<unknown>(`${BASE}/gestion/${encodeURIComponent(codigo)}/contactos`, contacto);
  return contactoResponseEnvelopeSchema.parse(data).data;
}
