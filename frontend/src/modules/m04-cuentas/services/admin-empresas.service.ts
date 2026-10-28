import { apiClient } from '@/core/api/apiClient';
import type { RespuestaExitosa } from '@/core/types/respuesta-api.type';
import type { DictamenSolicitudEmpresaFormData } from '../dtos/m04-cuentas.dto';
import type {
  CuentaEmpresaAdmin,
  FiltroCuentasEmpresa,
  FiltroSolicitudes,
  ListaPaginada,
  RenovacionNitAdmin,
  SolicitudEmpresaAdmin,
  TipoClienteOpcion,
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
  return {
    decision: dictamen.decision,
    ...(motivo ? { motivoRechazo: motivo } : {}),
    // El tipo de cliente solo viaja al aprobar (M06 · D8).
    ...(dictamen.decision === 'aprobar' && dictamen.idSubRolEmpresa !== undefined
      ? { idSubRolEmpresa: dictamen.idSubRolEmpresa }
      : {}),
  };
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

/** M06 · D8: tipos de cliente empresa activos, para elegir al aprobar una cuenta. */
export async function listarTiposCliente(): Promise<TipoClienteOpcion[]> {
  const { data } = await apiClient.get<RespuestaExitosa<TipoClienteOpcion[]>>('/admin/empresas/tipos');
  return data.data;
}

/** M06 · D8: cuentas empresa aprobadas con su tipo de cliente. */
export async function listarCuentasEmpresa(filtro: FiltroCuentasEmpresa): Promise<ListaPaginada<CuentaEmpresaAdmin>> {
  const params: Record<string, string | number | boolean> = {};
  if (filtro.busqueda?.trim()) params.busqueda = filtro.busqueda.trim();
  if (filtro.sinTipo) params.sinTipo = true;
  if (filtro.page) params.page = filtro.page;
  if (filtro.limit) params.limit = filtro.limit;
  const { data } = await apiClient.get<RespuestaExitosa<ListaPaginada<CuentaEmpresaAdmin>>>('/admin/empresas/cuentas', {
    params,
  });
  return data.data;
}

/** M06 · D8: cambia el tipo de cliente de una cuenta empresa. */
export async function cambiarTipoCliente(idUsuario: number, idSubRolEmpresa: number): Promise<CuentaEmpresaAdmin> {
  const { data } = await apiClient.patch<RespuestaExitosa<CuentaEmpresaAdmin>>(
    `/admin/empresas/cuentas/${idUsuario}/tipo`,
    { idSubRolEmpresa },
  );
  return data.data;
}
