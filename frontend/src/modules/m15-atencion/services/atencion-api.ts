import { apiClient } from '@/core/api/apiClient';
import type { RespuestaExitosa } from '@/core/types/respuesta-api.type';
import type {
  CalificacionAtencion,
  CanalWhatsappPublico,
  ConfiguracionWhatsapp,
  ConfirmacionContacto,
  EstadoSolicitudContacto,
  FranjaHorario,
  HorarioAtencion,
  MensajeSolicitudContacto,
  Paginacion,
  PaginaSolicitudes,
  SolicitudContacto,
  SolicitudContactoDetalle,
  TipoSolicitudContacto,
} from '../interfaces/atencion.interface';

interface RespuestaPaginada<T> {
  success: true;
  data: T[];
  pagination: Paginacion;
}

/* ── Público y Cliente ────────────────────────────────────────────────────── */

export async function obtenerHorario(): Promise<HorarioAtencion> {
  const { data } = await apiClient.get<RespuestaExitosa<HorarioAtencion>>('/atencion/horario');
  return data.data;
}

export async function obtenerCanal(): Promise<CanalWhatsappPublico> {
  const { data } = await apiClient.get<RespuestaExitosa<CanalWhatsappPublico>>('/atencion/whatsapp');
  return data.data;
}

export async function enviarSolicitudContacto(solicitud: {
  tipo: TipoSolicitudContacto;
  descripcion: string;
}): Promise<ConfirmacionContacto> {
  const { data } = await apiClient.post<RespuestaExitosa<ConfirmacionContacto>>(
    '/atencion/contacto',
    solicitud,
  );
  return data.data;
}

export async function listarMisSolicitudes(query: {
  pagina: number;
  limite: number;
  tipo?: TipoSolicitudContacto;
  estado?: EstadoSolicitudContacto;
}): Promise<PaginaSolicitudes> {
  const { data } = await apiClient.get<RespuestaPaginada<SolicitudContacto>>(
    '/atencion/mis-solicitudes',
    { params: query },
  );
  return { items: data.data, pagination: data.pagination };
}

export async function obtenerMiSolicitudDetalle(
  idSolicitud: string,
): Promise<SolicitudContactoDetalle> {
  const { data } = await apiClient.get<RespuestaExitosa<SolicitudContactoDetalle>>(
    `/atencion/mis-solicitudes/${idSolicitud}`,
  );
  return data.data;
}

export async function enviarMensajeCliente(
  idSolicitud: string,
  contenido: string,
): Promise<MensajeSolicitudContacto> {
  const { data } = await apiClient.post<RespuestaExitosa<MensajeSolicitudContacto>>(
    `/atencion/mis-solicitudes/${idSolicitud}/mensajes`,
    { contenido },
  );
  return data.data;
}

export async function calificarMiSolicitud(
  idSolicitud: string,
  calificacion: CalificacionAtencion,
): Promise<SolicitudContacto> {
  const { data } = await apiClient.patch<RespuestaExitosa<SolicitudContacto>>(
    `/atencion/mis-solicitudes/${idSolicitud}/calificacion`,
    { calificacion },
  );
  return data.data;
}

/* ── Panel: solicitudes de contacto ───────────────────────────────────────── */

export async function listarSolicitudes(query: {
  pagina: number;
  limite: number;
  tipo?: TipoSolicitudContacto;
  estado?: EstadoSolicitudContacto;
}): Promise<PaginaSolicitudes> {
  const { data } = await apiClient.get<RespuestaPaginada<SolicitudContacto>>(
    '/admin/atencion/solicitudes-contacto',
    { params: query },
  );
  return { items: data.data, pagination: data.pagination };
}

export async function obtenerSolicitudDetalleAdmin(
  idSolicitud: string,
): Promise<SolicitudContactoDetalle> {
  const { data } = await apiClient.get<RespuestaExitosa<SolicitudContactoDetalle>>(
    `/admin/atencion/solicitudes-contacto/${idSolicitud}`,
  );
  return data.data;
}

export async function enviarMensajeEquipo(
  idSolicitud: string,
  contenido: string,
): Promise<MensajeSolicitudContacto> {
  const { data } = await apiClient.post<RespuestaExitosa<MensajeSolicitudContacto>>(
    `/admin/atencion/solicitudes-contacto/${idSolicitud}/mensajes`,
    { contenido },
  );
  return data.data;
}

export async function cambiarEstadoSolicitud(
  idSolicitud: string,
  estado: EstadoSolicitudContacto,
): Promise<SolicitudContacto> {
  const { data } = await apiClient.patch<RespuestaExitosa<SolicitudContacto>>(
    `/admin/atencion/solicitudes-contacto/${idSolicitud}/estado`,
    { estado },
  );
  return data.data;
}

export async function marcarSolicitudAtendida(idSolicitud: string): Promise<SolicitudContacto> {
  const { data } = await apiClient.patch<RespuestaExitosa<SolicitudContacto>>(
    `/admin/atencion/solicitudes-contacto/${idSolicitud}/atender`,
  );
  return data.data;
}

/* ── Panel: horario y canal ───────────────────────────────────────────────── */

export async function obtenerHorarioAdmin(): Promise<HorarioAtencion> {
  const { data } = await apiClient.get<RespuestaExitosa<HorarioAtencion>>('/admin/atencion/horario');
  return data.data;
}

export async function guardarHorario(franjas: FranjaHorario[]): Promise<HorarioAtencion> {
  const { data } = await apiClient.put<RespuestaExitosa<HorarioAtencion>>('/admin/atencion/horario', {
    franjas,
  });
  return data.data;
}

export async function obtenerCanalAdmin(): Promise<ConfiguracionWhatsapp> {
  const { data } = await apiClient.get<RespuestaExitosa<ConfiguracionWhatsapp>>(
    '/admin/atencion/whatsapp',
  );
  return data.data;
}

export async function guardarCanal(datos: {
  destino: string;
  mensajeBase: string | null;
}): Promise<ConfiguracionWhatsapp> {
  const { data } = await apiClient.put<RespuestaExitosa<ConfiguracionWhatsapp>>(
    '/admin/atencion/whatsapp',
    datos,
  );
  return data.data;
}