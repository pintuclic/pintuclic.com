import { apiClient } from '@/core/api/apiClient';
import type { RespuestaExitosa } from '@/core/types/respuesta-api.type';
import type { TarjetaProducto } from '../interfaces/cuestionario.interface';

export interface TurnoChat {
  rol: 'usuario' | 'asistente';
  texto: string;
}

export interface RespuestaAsistente {
  respuesta: string;
  productos: TarjetaProducto[];
  /** H7: destaca el botón hacia el formulario de contacto de M15. */
  ofrecerAsesor: boolean;
}

export interface EstadoAsistente {
  disponible: boolean;
  motivo: 'no_configurado' | 'suspendido' | null;
}

export async function obtenerEstadoAsistente(): Promise<EstadoAsistente> {
  const { data } = await apiClient.get<RespuestaExitosa<EstadoAsistente>>('/asesoria/asistente/estado');
  return data.data;
}

/** H1: el servidor no guarda la conversación; el historial viaja con cada mensaje. */
export async function enviarMensajeAsistente(
  mensaje: string,
  historial: TurnoChat[],
): Promise<RespuestaAsistente> {
  const { data } = await apiClient.post<RespuestaExitosa<RespuestaAsistente>>(
    '/asesoria/asistente/mensajes',
    { mensaje, historial },
  );
  return data.data;
}
