import { apiClient } from '@/core/api/apiClient';
import type { RespuestaExitosa } from '@/core/types/respuesta-api.type';
import type {
  CanalWhatsappPublico,
  ConfiguracionWhatsapp,
  ConfirmacionContacto,
  EstadoSolicitudContacto,
  FranjaHorario,
  HorarioAtencion,
  Paginacion,
  PaginaSolicitudes,
  SolicitudContacto,
  TipoSolicitudContacto,
} from '../interfaces/atencion.interface';

interface RespuestaPaginada<T> {
  success: true;
  data: T[];
  pagination: Paginacion;
}

/* ── Público ──────────────────────────────────────────────────────────────── */

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
