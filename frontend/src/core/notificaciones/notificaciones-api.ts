import { apiClient } from '../api/apiClient';
import {
  conteoResponseEnvelopeSchema,
  listarResponseEnvelopeSchema,
  notificacionResponseEnvelopeSchema,
  resumenResponseEnvelopeSchema,
  type ListaNotificaciones,
  type Notificacion,
  type Resumen,
  type Seccion,
} from './fp02-notificaciones.dto';

/**
 * Cliente de `/notificaciones` (contrato FP-02). El navegador revalida `/resumen` con su ETag por su cuenta (el servidor
 * responde `Cache-Control: no-cache`): si nada cambió, no baja el cuerpo.
 */
export async function obtenerResumen(): Promise<Resumen> {
  const { data } = await apiClient.get<unknown>('/notificaciones/resumen');
  return resumenResponseEnvelopeSchema.parse(data).data;
}

export async function listarNotificaciones(pagina: number, limite: number): Promise<ListaNotificaciones> {
  const { data } = await apiClient.get<unknown>('/notificaciones', { params: { pagina, limite } });
  return listarResponseEnvelopeSchema.parse(data).data;
}

export async function marcarCampanaVista(): Promise<number> {
  const { data } = await apiClient.post<unknown>('/notificaciones/campana/vista');
  return conteoResponseEnvelopeSchema.parse(data).data.cantidad;
}

export async function marcarTodasLeidas(): Promise<number> {
  const { data } = await apiClient.post<unknown>('/notificaciones/leer-todas');
  return conteoResponseEnvelopeSchema.parse(data).data.cantidad;
}

export async function marcarSeccionLeida(seccion: Seccion): Promise<number> {
  const { data } = await apiClient.post<unknown>(`/notificaciones/secciones/${seccion}/leer`);
  return conteoResponseEnvelopeSchema.parse(data).data.cantidad;
}

export async function marcarLeida(idNotificacion: string): Promise<Notificacion> {
  const { data } = await apiClient.post<unknown>(`/notificaciones/${idNotificacion}/leer`);
  return notificacionResponseEnvelopeSchema.parse(data).data;
}
