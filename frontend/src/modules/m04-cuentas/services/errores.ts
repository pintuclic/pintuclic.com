import { isAxiosError } from 'axios';
import { esRespuestaError } from '@/core/api/apiClient';

export interface ErrorCuentas {
  /** Código semántico del backend (p. ej. `CREDENCIALES_INVALIDAS`), o `null` si no llegó. */
  codigo: string | null;
  /** HTTP status, si hubo respuesta. */
  estado: number | null;
  /** Mensaje apto para mostrar al usuario. */
  mensaje: string;
}

const GENERICO = 'No fue posible completar la operación. Inténtalo de nuevo.';
const SIN_CONEXION = 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';

/**
 * Mensajes propios para los casos en que el texto del servidor no basta o debe
 * ser deliberadamente genérico. RN-CUE-06: el login nunca revela si el correo
 * existe; RN-SEG-08: el 404 opaco no se explica.
 */
const MENSAJES: Readonly<Record<string, string>> = {
  CREDENCIALES_INVALIDAS: 'El correo o la contraseña no son correctos.',
  CONTRASENA_INCORRECTA: 'La contraseña actual no es correcta.',
  ACCESO_TEMPORALMENTE_RESTRINGIDO:
    'Por seguridad bloqueamos temporalmente el acceso con este correo. Inténtalo de nuevo en unos minutos.',
  RECURSO_NO_DISPONIBLE: 'El recurso solicitado no está disponible.',
  SESION_EXPIRADA: 'Tu sesión ha expirado. Vuelve a iniciar sesión.',
};

/**
 * Traduce cualquier fallo de una llamada a la API en un `ErrorCuentas`.
 * Recibe `unknown` a propósito: lo que llega de un `catch` no está tipado.
 */
export function aErrorCuentas(error: unknown): ErrorCuentas {
  if (isAxiosError<unknown>(error)) {
    const estado = error.response?.status ?? null;
    if (estado === null) {
      return { codigo: null, estado: null, mensaje: SIN_CONEXION };
    }
    const cuerpo = error.response?.data;
    if (esRespuestaError(cuerpo)) {
      const codigo = String(cuerpo.error.code);
      const mensaje = MENSAJES[codigo] ?? (cuerpo.error.message || GENERICO);
      return { codigo, estado, mensaje };
    }
    return { codigo: null, estado, mensaje: GENERICO };
  }
  return { codigo: null, estado: null, mensaje: GENERICO };
}
