import { apiClient } from '@/core/api/apiClient';
import {
  solicitudPostventaResponseEnvelopeSchema,
  listaPostventaResponseEnvelopeSchema,
  resumenGestionPostventaResponseEnvelopeSchema,
  type SolicitarCancelacionRequest,
  type SolicitarDevolucionRequest,
  type ResolverSolicitudRequest,
  type RegistrarReembolsoRequest,
  type ListarMisSolicitudesRequest,
  type ListarGestionPostventaRequest,
  type SolicitudPostventaDetalle,
  type SolicitudPostventaResumen,
  type EstadoPostventa,
  type Paginacion,
} from '../dtos/m11-postventa.dto';

const BASE = '/postventa';

/* ── Rutas Cliente Titular ────────────────────────────────────────────────── */

export async function solicitarCancelacion(
  input: SolicitarCancelacionRequest
): Promise<SolicitudPostventaDetalle> {
  const { data } = await apiClient.post<unknown>(`${BASE}/cancelar`, input);
  return solicitudPostventaResponseEnvelopeSchema.parse(data).data;
}

export async function solicitarDevolucion(
  input: SolicitarDevolucionRequest
): Promise<SolicitudPostventaDetalle> {
  const { data } = await apiClient.post<unknown>(`${BASE}/devolver`, input);
  return solicitudPostventaResponseEnvelopeSchema.parse(data).data;
}

export async function listarMisSolicitudes(
  query: Partial<ListarMisSolicitudesRequest> = {}
): Promise<{ items: SolicitudPostventaResumen[]; paginacion: Paginacion }> {
  const { data } = await apiClient.get<unknown>(`${BASE}/mis-solicitudes`, {
    params: query,
  });
  const cuerpo = listaPostventaResponseEnvelopeSchema.parse(data);
  return { items: cuerpo.data, paginacion: cuerpo.pagination };
}

export async function obtenerMiSolicitud(
  codigo: string
): Promise<SolicitudPostventaDetalle> {
  const { data } = await apiClient.get<unknown>(
    `${BASE}/mis-solicitudes/${encodeURIComponent(codigo)}`
  );
  return solicitudPostventaResponseEnvelopeSchema.parse(data).data;
}

/* ── Rutas Gestión Administrativa ─────────────────────────────────────────── */

export async function listarGestion(
  filtros: Partial<ListarGestionPostventaRequest> = {}
): Promise<{ items: SolicitudPostventaResumen[]; paginacion: Paginacion }> {
  const { data } = await apiClient.get<unknown>(`${BASE}/gestion`, {
    params: filtros,
  });
  const cuerpo = listaPostventaResponseEnvelopeSchema.parse(data);
  return { items: cuerpo.data, paginacion: cuerpo.pagination };
}

export async function obtenerResumenGestion(): Promise<
  Array<{ estado: EstadoPostventa; cantidad: number }>
> {
  const { data } = await apiClient.get<unknown>(`${BASE}/gestion/resumen`);
  return resumenGestionPostventaResponseEnvelopeSchema.parse(data).data;
}

export async function obtenerGestionPorCodigo(
  codigo: string
): Promise<SolicitudPostventaDetalle> {
  const { data } = await apiClient.get<unknown>(
    `${BASE}/gestion/${encodeURIComponent(codigo)}`
  );
  return solicitudPostventaResponseEnvelopeSchema.parse(data).data;
}

export async function resolverSolicitud(
  codigo: string,
  input: ResolverSolicitudRequest
): Promise<SolicitudPostventaDetalle> {
  const { data } = await apiClient.patch<unknown>(
    `${BASE}/gestion/${encodeURIComponent(codigo)}/resolver`,
    input
  );
  return solicitudPostventaResponseEnvelopeSchema.parse(data).data;
}

export async function registrarReembolso(
  codigo: string,
  input: RegistrarReembolsoRequest
): Promise<SolicitudPostventaDetalle> {
  const { data } = await apiClient.post<unknown>(
    `${BASE}/gestion/${encodeURIComponent(codigo)}/reembolsar`,
    input
  );
  return solicitudPostventaResponseEnvelopeSchema.parse(data).data;
}
