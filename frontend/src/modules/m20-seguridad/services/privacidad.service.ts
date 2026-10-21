import { apiClient } from '@/core/api/apiClient';
import type { RespuestaExitosa } from '@/core/types/respuesta-api.type';
import type {
  AvisoPrivacidad,
  Consentimiento,
  SolicitudSupresion,
} from '../interfaces/privacidad.interface';
import type {
  CrearSolicitudSupresionDto,
  OtorgarConsentimientoDto,
} from '../dtos/privacidad.dto';

/**
 * Cliente tipado de los endpoints de privacidad de M20 (HU-SEG-05).
 *
 * Regla de Oro #4 del Frontend: ninguna vista invoca una URL directamente; toda
 * petición pasa por aquí. Las pantallas que consumirán este servicio las
 * construirá el Líder Frontend cuando el Product Owner abra ese apartado.
 */

const BASE = '/seguridad/privacidad';

/** RF-SEG-05-03 — Público: no exige sesión. */
export async function obtenerAvisoVigente(): Promise<AvisoPrivacidad> {
  const { data } = await apiClient.get<RespuestaExitosa<AvisoPrivacidad>>(`${BASE}/aviso-vigente`);
  return data.data;
}

/** RF-SEG-05-01/02 — Deja constancia de fecha y versión aceptada. */
export async function otorgarConsentimiento(
  payload: OtorgarConsentimientoDto,
): Promise<Consentimiento> {
  const { data } = await apiClient.post<RespuestaExitosa<Consentimiento>>(
    `${BASE}/consentimiento`,
    payload,
  );
  return data.data;
}

export async function obtenerMiConsentimiento(): Promise<Consentimiento> {
  const { data } = await apiClient.get<RespuestaExitosa<Consentimiento>>(`${BASE}/consentimiento`);
  return data.data;
}

/** RF-SEG-05-06 — Registra la solicitud y el servidor confirma su recepción. */
export async function solicitarSupresion(
  payload: CrearSolicitudSupresionDto = {},
): Promise<SolicitudSupresion> {
  const { data } = await apiClient.post<RespuestaExitosa<SolicitudSupresion>>(
    `${BASE}/supresion`,
    payload,
  );
  return data.data;
}

/** Solo las del propio titular: el servidor resuelve la titularidad (RF-SEG-03-02). */
export async function listarMisSolicitudes(): Promise<SolicitudSupresion[]> {
  const { data } = await apiClient.get<RespuestaExitosa<SolicitudSupresion[]>>(`${BASE}/supresion`);
  return data.data;
}
