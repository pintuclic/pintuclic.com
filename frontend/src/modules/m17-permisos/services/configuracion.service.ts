import { apiClient } from '@/core/api/apiClient';
import type { RespuestaExitosa } from '@/core/types/respuesta-api.type';
import type { ClaveParametro } from '../dtos/configuracion.dto';
import type {
  ActualizarParametroRespuesta,
  CatalogoParametrosRespuesta,
} from '../interfaces/configuracion.interface';

/**
 * HU-ADM-06: Obtener catálogo completo de los 10 parámetros del sistema.
 */
export async function obtenerCatalogoParametros(): Promise<CatalogoParametrosRespuesta> {
  const { data } = await apiClient.get<RespuestaExitosa<CatalogoParametrosRespuesta>>(
    '/admin/configuracion',
  );
  return data.data;
}

/**
 * HU-ADM-06: Actualizar el valor de un parámetro del sistema con validación de rangos.
 */
export async function actualizarParametro(
  clave: ClaveParametro,
  valor: number | string | boolean,
): Promise<ActualizarParametroRespuesta> {
  const { data } = await apiClient.put<RespuestaExitosa<ActualizarParametroRespuesta>>(
    `/admin/configuracion/${clave}`,
    { valor },
  );
  return data.data;
}
