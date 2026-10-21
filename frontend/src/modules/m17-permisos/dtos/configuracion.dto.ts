import { z } from 'zod';

/**
 * ==============================================================================
 * DTOs de Configuración Global y Parámetros — M17 (Frontend)
 * ==============================================================================
 * 10 Parámetros del Sistema Oficiales (RF-ADM-06-02 / RF-ADM-06-03 / RF-ADM-06-04).
 */

export const CLAVES_PARAMETROS = [
  'auth.vigencia_codigo_registro_minutos',
  'auth.intentos_codigo_registro',
  'auth.complejidad_minima_contrasena',
  'auth.vigencia_enlace_recuperacion_minutos',
  'auth.intentos_fallidos_bloqueo',
  'auth.duracion_bloqueo_minutos',
  'comms.reintentos_envio_transaccional',
  'comercial.iva_porcentaje',
  'comercial.costo_envio_base',
  'comercial.umbral_envio_gratis',
] as const;

export const claveParametroSchema = z.enum(CLAVES_PARAMETROS);
export type ClaveParametro = z.infer<typeof claveParametroSchema>;

export const actualizarParametroDto = z.object({
  valor: z.union([z.number(), z.string(), z.boolean()]),
});
export type ActualizarParametroFormData = z.infer<typeof actualizarParametroDto>;

export const editarParametroFormSchema = z.object({
  valor: z
    .string()
    .trim()
    .min(1, 'El valor no puede estar vacío (RN-ADM-15)'),
});
export type EditarParametroFormData = z.infer<typeof editarParametroFormSchema>;

export function validarValorParametro(
  parametro: {
    tipoDato: 'numero' | 'texto' | 'booleano';
    rangoMinimo?: number;
    rangoMaximo?: number;
  },
  valorString: string,
): { valido: true; valor: number | string | boolean } | { valido: false; error: string } {
  const limpio = valorString.trim();
  if (limpio.length === 0) {
    return { valido: false, error: 'El valor no puede estar vacío (RN-ADM-15)' };
  }

  if (parametro.tipoDato === 'numero') {
    const num = Number(limpio);
    if (isNaN(num) || !Number.isFinite(num)) {
      return { valido: false, error: 'Debe ingresar un valor numérico válido' };
    }
    if (parametro.rangoMinimo !== undefined && num < parametro.rangoMinimo) {
      return { valido: false, error: `El valor mínimo permitido es ${parametro.rangoMinimo}` };
    }
    if (parametro.rangoMaximo !== undefined && num > parametro.rangoMaximo) {
      return { valido: false, error: `El valor máximo permitido es ${parametro.rangoMaximo}` };
    }
    return { valido: true, valor: num };
  }

  if (parametro.tipoDato === 'booleano') {
    const lower = limpio.toLowerCase();
    if (lower !== 'true' && lower !== 'false') {
      return { valido: false, error: 'El valor debe ser "true" o "false"' };
    }
    return { valido: true, valor: lower === 'true' };
  }

  return { valido: true, valor: limpio };
}
