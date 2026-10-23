import { apiClient } from '@/core/api/apiClient';
import type { RespuestaExitosa } from '@/core/types/respuesta-api.type';
import type { DictamenSolicitudEmpresaFormData } from '../dtos/m04-cuentas.dto';
import type {
  FiltroSolicitudes,
  ListaPaginada,
  RenovacionNitAdmin,
  SolicitudEmpresaAdmin,
} from '../interfaces/api.interfaces';

/**
 * HU-CUE-09 · Panel de decisión (permiso `empresas.validar`). El servidor
 * revalida el permiso en cada petición; sin él responde un 404 opaco.
 */

/** Quita los filtros vacíos para no enviar `estado=` (el backend lo rechazaría). */
function parametros(filtro: FiltroSolicitudes): Record<string, string | number> {
  const salida: Record<string, string | number> = {};
  if (filtro.estado) salida.estado = filtro.estado;
  if (filtro.page) salida.page = filtro.page;
  if (filtro.limit) salida.limit = filtro.limit;
  return salida;
}

/** Un motivo vacío o de espacios se envía como ausente (es opcional, RN-CUE-17). */
function cuerpoDictamen(dictamen: DictamenSolicitudEmpresaFormData) {
  const motivo = dictamen.motivoRechazo?.trim();
  return { decision: dictamen.decision, ...(motivo ? { motivoRechazo: motivo } : {}) };
}

export async function listarSolicitudes(filtro: FiltroSolicitudes): Promise<ListaPaginada<SolicitudEmpresaAdmin>> {
  const { data } = await apiClient.get<RespuestaExitosa<ListaPaginada<SolicitudEmpresaAdmin>>>(
    '/admin/empresas/solicitudes',
    { params: parametros(filtro) },
  );
  return data.data;
}

export async function dictaminarSolicitud(
  idSolicitud: string,
  dictamen: DictamenSolicitudEmpresaFormData,
): Promise<SolicitudEmpresaAdmin> {
  const { data } = await apiClient.post<RespuestaExitosa<SolicitudEmpresaAdmin>>(
    `/admin/empresas/solicitudes/${encodeURIComponent(idSolicitud)}/dictamen`,
    cuerpoDictamen(dictamen),
  );
  return data.data;
}

export async function listarRenovaciones(filtro: FiltroSolicitudes): Promise<ListaPaginada<RenovacionNitAdmin>> {
  const { data } = await apiClient.get<RespuestaExitosa<ListaPaginada<RenovacionNitAdmin>>>(
    '/admin/empresas/renovaciones',
    { params: parametros(filtro) },
  );
  return data.data;
}

export async function obtenerRenovacion(idSolicitud: string): Promise<RenovacionNitAdmin> {
  const { data } = await apiClient.get<RespuestaExitosa<RenovacionNitAdmin>>(
    `/admin/empresas/renovaciones/${encodeURIComponent(idSolicitud)}`,
  );
  return data.data;
}

export async function dictaminarRenovacion(
  idSolicitud: string,
  dictamen: DictamenSolicitudEmpresaFormData,
): Promise<RenovacionNitAdmin> {
  const { data } = await apiClient.post<RespuestaExitosa<RenovacionNitAdmin>>(
    `/admin/empresas/renovaciones/${encodeURIComponent(idSolicitud)}/dictamen`,
    cuerpoDictamen(dictamen),
  );
  return data.data;
}

/** Descarga el RUT como Blob (con la cookie de sesión) para ofrecerlo al navegador. */
export async function descargarRut(idDocumento: string): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(`/admin/empresas/documentos/${encodeURIComponent(idDocumento)}`, {
    responseType: 'blob',
  });
  return data;
}
