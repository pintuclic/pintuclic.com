import type {
  ClaveParametroCuentas,
  ParametrosCuentasPort,
} from '../interfaces/parametros-cuentas.port';

/** Valores del seed (parametro_sistema): se usan si el parámetro falta o no es válido. */
const VALORES_POR_DEFECTO: Readonly<Record<ClaveParametroCuentas, number>> = {
  'auth.vigencia_codigo_registro_minutos': 15,
  'auth.intentos_codigo_registro': 3,
  'auth.vigencia_enlace_recuperacion_minutos': 30,
  'auth.intentos_fallidos_bloqueo': 5,
  'auth.duracion_bloqueo_minutos': 15,
};

/**
 * Lee un parámetro de autenticación. Un fallo de lectura no tumba el login ni el
 * registro: se aplica el valor por defecto, que es igual de restrictivo.
 */
export async function leerParametroCuentas(
  parametros: ParametrosCuentasPort | undefined,
  clave: ClaveParametroCuentas,
): Promise<number> {
  if (parametros === undefined) {
    return VALORES_POR_DEFECTO[clave];
  }
  try {
    const valor = await parametros.obtenerNumero(clave);
    return valor !== null && Number.isInteger(valor) && valor > 0 ? valor : VALORES_POR_DEFECTO[clave];
  } catch {
    return VALORES_POR_DEFECTO[clave];
  }
}
