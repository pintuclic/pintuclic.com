import type { CodigoError, RespuestaError } from '@/core/types/respuesta-api.type';

/**
 * HU-SEG-06 — Traducción de errores de la API a mensajes de usuario.
 *
 * El backend ya entrega mensajes que no revelan rutas, consultas ni versiones
 * (RF-SEG-06-04). Esta capa existe para que la interfaz nunca caiga en el
 * reflejo de pintar `error.message` de una excepción cruda, que sí podría
 * filtrar detalle interno.
 *
 * Ante cualquier cosa que no reconozca, devuelve el mensaje genérico. El silencio
 * es preferible a una fuga.
 */

const MENSAJES: Readonly<Record<CodigoError, string>> = {
  RECURSO_NO_DISPONIBLE: 'El recurso solicitado no está disponible.',
  SESION_EXPIRADA: 'Tu sesión ha expirado. Vuelve a iniciar sesión para continuar.',
  CREDENCIALES_INVALIDAS: 'Los datos de acceso no son correctos.',
  CONSENTIMIENTO_REQUERIDO: 'Debes aceptar el aviso de privacidad vigente para continuar.',
  SOLICITUD_DUPLICADA: 'Ya tienes una solicitud en trámite.',
  ERROR_INTERNO: 'No fue posible completar la operación. Inténtalo de nuevo.',
};

const GENERICO = 'No fue posible completar la operación. Inténtalo de nuevo.';

function esCodigoConocido(valor: unknown): valor is CodigoError {
  return typeof valor === 'string' && valor in MENSAJES;
}

/**
 * ⚠️ Acepta `unknown` a propósito: lo que llega de un `catch` no está tipado, y
 * el estrechamiento debe hacerse aquí y no en cada vista.
 */
export function mensajeDeError(error: unknown): string {
  if (typeof error !== 'object' || error === null) {
    return GENERICO;
  }

  const posibleAxios = error as { response?: { data?: unknown } };
  const cuerpo = posibleAxios.response?.data ?? error;

  if (typeof cuerpo !== 'object' || cuerpo === null) {
    return GENERICO;
  }

  const candidato = cuerpo as Partial<RespuestaError>;
  if (candidato.success === false && esCodigoConocido(candidato.error?.code)) {
    return MENSAJES[candidato.error.code];
  }
  return GENERICO;
}

export function codigoDeError(error: unknown): CodigoError | null {
  if (typeof error !== 'object' || error === null) {
    return null;
  }
  const posibleAxios = error as { response?: { data?: unknown } };
  const cuerpo = posibleAxios.response?.data;
  if (typeof cuerpo !== 'object' || cuerpo === null) {
    return null;
  }
  const candidato = cuerpo as Partial<RespuestaError>;
  return esCodigoConocido(candidato.error?.code) ? candidato.error.code : null;
}
