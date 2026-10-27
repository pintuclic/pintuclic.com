import { z } from 'zod';

/**
 * Esquemas del formulario de la calculadora (M03 · K8).
 *
 * Viven aquí y nunca dentro de un `.tsx` (AGENTS.md). Son los mismos límites que valida el
 * servidor, para que el formulario avise antes de enviar y nunca llegue un error genérico.
 *
 * El área y las manos se escriben en campos de texto: un `<input type="number">` vacío
 * entrega `NaN` y no se puede distinguir de un cero. Así se puede exigir las manos sin
 * suponerlas (RF-ASE-02-06) y decir qué falta.
 */

const AREA_MAXIMA = 100_000;
const MANOS_MAXIMAS = 10;
const UNIDADES_MAXIMAS = 1000;

/** Acepta coma o punto como separador decimal: la gente escribe «12,5». */
function aNumero(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.');
  if (limpio === '' || !/^\d*\.?\d*$/.test(limpio)) return null;
  const valor = Number(limpio);
  return Number.isFinite(valor) ? valor : null;
}

function decimales(texto: string): number {
  const limpio = texto.trim().replace(',', '.');
  const punto = limpio.indexOf('.');
  return punto === -1 ? 0 : limpio.length - punto - 1;
}

export const areaCampoSchema = z
  .string()
  .trim()
  .min(1, 'Indica el área a pintar en metros cuadrados')
  .refine((t) => aNumero(t) !== null, 'Escribe el área en números')
  .refine((t) => (aNumero(t) ?? 0) > 0, 'El área debe ser mayor que cero')
  .refine((t) => (aNumero(t) ?? 0) <= AREA_MAXIMA, `El área no puede pasar de ${AREA_MAXIMA} m²`)
  .refine((t) => decimales(t) <= 2, 'Usa como máximo dos decimales');

export const manosCampoSchema = z
  .string()
  .trim()
  .min(1, 'Indica cuántas manos vas a dar')
  .refine((t) => /^\d+$/.test(t), 'Las manos deben ser un número entero')
  .refine((t) => Number(t) >= 1, 'Indica al menos una mano')
  .refine((t) => Number(t) <= MANOS_MAXIMAS, `Como máximo ${MANOS_MAXIMAS} manos`);

export const unidadesCampoSchema = z
  .string()
  .trim()
  .min(1, 'Indica cuántas unidades tienes')
  .refine((t) => /^\d+$/.test(t), 'Las unidades deben ser un número entero')
  .refine((t) => Number(t) >= 1, 'Indica al menos una unidad')
  .refine((t) => Number(t) <= UNIDADES_MAXIMAS, `Como máximo ${UNIDADES_MAXIMAS} unidades`);

export const presentacionCampoSchema = z.string().min(1, 'Elige la presentación');

/** Cuánto comprar para un área (K3). */
export const formularioCantidadSchema = z.object({
  idVariante: presentacionCampoSchema,
  area: areaCampoSchema,
  manos: manosCampoSchema,
});
export type FormularioCantidad = z.infer<typeof formularioCantidadSchema>;

/** Cuánta área cubre una cantidad (K4). */
export const formularioCoberturaSchema = z.object({
  idVariante: presentacionCampoSchema,
  unidades: unidadesCampoSchema,
  manos: manosCampoSchema,
});
export type FormularioCobertura = z.infer<typeof formularioCoberturaSchema>;

/** Convierte el campo ya validado al número que espera la API. */
export function numeroDeCampo(texto: string): number {
  return aNumero(texto) ?? 0;
}
