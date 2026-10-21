import { apiClient } from '@/core/api/apiClient';
import type { RespuestaExitosa } from '@/core/types/respuesta-api.type';
import type {
  ConfirmarSustitucionRespuesta,
  PrimerAccesoRespuesta,
  SolicitudSustitucionRespuesta,
} from '../interfaces/gobernanza.interface';

/**
 * HU-ADM-07: Solicitar sustitución de correo maestro de la cuenta administradora.
 */
export async function solicitarSustitucionCorreo(
  nuevoCorreo: string,
): Promise<SolicitudSustitucionRespuesta> {
  const { data } = await apiClient.post<RespuestaExitosa<SolicitudSustitucionRespuesta>>(
    '/admin/gobernanza/sustituir-correo',
    { nuevoCorreo },
  );
  return data.data;
}

/**
 * HU-ADM-07: Confirmar sustitución de correo con token OTP único de 64 caracteres.
 */
export async function confirmarSustitucionCorreo(
  tokenConfirmacion: string,
): Promise<ConfirmarSustitucionRespuesta> {
  const { data } = await apiClient.post<RespuestaExitosa<ConfirmarSustitucionRespuesta>>(
    '/admin/gobernanza/confirmar-correo',
    { tokenConfirmacion },
  );
  return data.data;
}

/**
 * HU-ADM-01 / HU-ADM-07: Primer acceso y cambio forzoso de contraseña temporal.
 */
export async function primerAcceso(
  credencialTemporal: string,
  nuevaContrasena: string,
): Promise<PrimerAccesoRespuesta> {
  const { data } = await apiClient.post<RespuestaExitosa<PrimerAccesoRespuesta>>(
    '/admin/primer-acceso',
    { credencialTemporal, nuevaContrasena },
  );
  return data.data;
}
