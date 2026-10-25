import { apiClient } from '@/core/api/apiClient';
import type { RespuestaExitosa } from '@/core/types/respuesta-api.type';
import type {
  EstadoEnvio,
  ListarEnviosRespuesta,
  ListarPlantillasRespuesta,
  ListarRebotesRespuesta,
  PlantillaNotificacion,
  PrevisualizarPlantillaRespuesta,
  TipoComunicacion,
} from '../interfaces/m18-notificaciones.interface';

/** HU-NOT-03: catálogo de plantillas de comunicación. */
export async function listarPlantillas(): Promise<ListarPlantillasRespuesta> {
  const { data } = await apiClient.get<RespuestaExitosa<ListarPlantillasRespuesta>>(
    '/admin/notificaciones/plantillas',
  );
  return data.data;
}

export async function actualizarPlantilla(
  tipo: TipoComunicacion,
  cambios: { asunto: string; contenidoHtml: string; contenidoTexto: string },
): Promise<PlantillaNotificacion> {
  const { data } = await apiClient.put<RespuestaExitosa<PlantillaNotificacion>>(
    `/admin/notificaciones/plantillas/${tipo}`,
    cambios,
  );
  return data.data;
}

export async function previsualizarPlantilla(
  tipo: TipoComunicacion,
  datosEjemplo?: Record<string, string>,
): Promise<PrevisualizarPlantillaRespuesta> {
  const { data } = await apiClient.post<RespuestaExitosa<PrevisualizarPlantillaRespuesta>>(
    `/admin/notificaciones/plantillas/${tipo}/preview`,
    { datosEjemplo },
  );
  return data.data;
}

/** HU-NOT-04 / RT-23: registro de envíos y rebotes para diagnóstico. */
export async function listarEnvios(query: {
  pagina: number;
  limite: number;
  tipo?: TipoComunicacion;
  estado?: EstadoEnvio;
}): Promise<ListarEnviosRespuesta> {
  const { data } = await apiClient.get<RespuestaExitosa<ListarEnviosRespuesta>>(
    '/admin/notificaciones/envios',
    { params: query },
  );
  return data.data;
}

export async function listarRebotes(query: {
  pagina: number;
  limite: number;
}): Promise<ListarRebotesRespuesta> {
  const { data } = await apiClient.get<RespuestaExitosa<ListarRebotesRespuesta>>(
    '/admin/notificaciones/rebotes',
    { params: query },
  );
  return data.data;
}
