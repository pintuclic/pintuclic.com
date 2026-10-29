import { z } from 'zod';

/**
 * Esquemas del formulario de la calculadora (M03 · K8).
 *
 * Viven aquí y nunca dentro de un `.tsx` (AGENTS.md). Son los mismos límites que valida el
 * servidor, para que el formulario avise antes de enviar y nunca llegue un error genérico.
 *
 * Las medidas se escriben en campos de texto y no en `<input type="number">`: uno vacío
 * entrega `NaN`, que no se distingue de un cero, y entonces no hay forma de decir si falta
 * el dato o si escribieron un cero.
 *
 * Las manos NO se piden (K9, decisión del Product Owner del 2026-10-27). Las resuelve el
 * servidor y la pantalla las muestra junto al resultado.
 */

const AREA_MAXIMA = 100_000;
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
});
export type FormularioCantidad = z.infer<typeof formularioCantidadSchema>;

/** Cuánta área cubre una cantidad (K4). */
export const formularioCoberturaSchema = z.object({
  idVariante: presentacionCampoSchema,
  unidades: unidadesCampoSchema,
});
export type FormularioCobertura = z.infer<typeof formularioCoberturaSchema>;

/** Convierte el campo ya validado al número que espera la API. */
export function numeroDeCampo(texto: string): number {
  return aNumero(texto) ?? 0;
}

/* ───────────────────────────────────────────────────────────────────────────
 * MEDIDAS DE UNA SUPERFICIE (mockup VISTAS.pdf, pág. 10)
 *
 * El área ya no se escribe: se deduce de las medidas de la superficie. Quien calcula
 * sabe que su pared mide 5 × 2,5, no que son 25 m²; pedirle el área le obligaba a hacer
 * a mano justo la cuenta que viene a buscar.
 * ─────────────────────────────────────────────────────────────────────────── */

const MEDIDA_MAXIMA = 1000;
const REPETICIONES_MAXIMAS = 100;

/**
 * La medida de un lado, en metros.
 *
 * Recibe cómo se llama el lado porque cambia con la superficie: una pared se mide de
 * ancho y **alto**, un techo de ancho y **largo**. Así el mensaje de error nombra lo que
 * la persona tiene delante en vez de un «campo 2» genérico.
 */
export function medidaCampoSchema(lado: string) {
  const Lado = lado.charAt(0).toUpperCase() + lado.slice(1);
  return z
    .string()
    .trim()
    .min(1, `Indica ${lado} en metros`)
    .refine((t) => aNumero(t) !== null, `Escribe ${lado} en números`)
    .refine((t) => (aNumero(t) ?? 0) > 0, `${Lado} debe ser mayor que cero`)
    .refine((t) => (aNumero(t) ?? 0) <= MEDIDA_MAXIMA, `${Lado} no puede pasar de ${MEDIDA_MAXIMA} m`)
    .refine((t) => decimales(t) <= 2, 'Usa como máximo dos decimales');
}

/** Cuántas superficies iguales se van a pintar. Lo gobierna un contador, nunca queda vacío. */
export const repeticionesCampoSchema = z
  .string()
  .trim()
  .min(1, 'Indica cuántas vas a pintar')
  .refine((t) => /^\d+$/.test(t), 'Debe ser un número entero')
  .refine((t) => Number(t) >= 1, 'Indica al menos una')
  .refine((t) => Number(t) <= REPETICIONES_MAXIMAS, `Como máximo ${REPETICIONES_MAXIMAS}`);

/** Cuánto comprar, a partir de las medidas (K3 + mockup pág. 10). */
export function formularioMedidasSchema(ladoB: string) {
  return z.object({
    idVariante: presentacionCampoSchema,
    ancho: medidaCampoSchema('el ancho'),
    ladoMayor: medidaCampoSchema(ladoB),
    repeticiones: repeticionesCampoSchema,
  });
}

export interface FormularioMedidas {
  idVariante: string;
  ancho: string;
  ladoMayor: string;
  repeticiones: string;
}

/** El número escrito con dos decimales, como entero de centésimas. */
function centesimas(texto: string): number | null {
  const valor = aNumero(texto);
  if (valor === null) return null;
  // El campo admite dos decimales, así que `valor * 100` cae a menos de 1e-10 de un
  // entero y el redondeo lo recupera exacto.
  return Math.round(valor * 100);
}

/**
 * Área total en m²: ancho × ladoMayor × repeticiones, sin error de coma flotante.
 *
 * Multiplicando a secas, 1,1 × 2,2 da 2,4200000000000004: el servidor lo rechazaría por
 * tener más de dos decimales, y antes de eso la cifra en pantalla sería ridícula. Se
 * multiplica con enteros escalados y se redondea UNA sola vez al final, el mismo criterio
 * que `decimal-exacto.ts` aplica en el backend.
 *
 * Devuelve 0 cuando algún campo todavía no es un número válido, que es lo que la pantalla
 * necesita para no mostrar el área hasta que haya algo que mostrar.
 */
export function areaDeMedidas(ancho: string, ladoMayor: string, repeticiones: string): number {
  const a = centesimas(ancho);
  const b = centesimas(ladoMayor);
  const n = Number(repeticiones.trim());

  if (a === null || b === null || !Number.isInteger(n) || n < 1) return 0;
  if (a <= 0 || b <= 0) return 0;

  // a · b queda a escala 10 000; se vuelve a escala 100 redondeando al céntimo más cercano.
  return Math.round((a * b * n) / 100) / 100;
}

/* ───────────────────────────────────────────────────────────────────────────
 * SIMULADOR DE COLOR (HU-ASE-03, S1-S11)
 *
 * Espejo de la sección 9 de `contracts/m03-asesoria.contract.ts`. No hay endpoints: el
 * simulador vive entero en el navegador, así que estos esquemas fijan la forma del catálogo
 * de ambientes y de lo que M01 le entrega. Una prueba comprueba que el aviso no se separe
 * del contrato.
 * ─────────────────────────────────────────────────────────────────────────── */

/** S7: el aviso que acompaña a toda vista del simulador. */
export const ADVERTENCIA_SIMULADOR =
  'El color de la pantalla es una referencia: el resultado real depende de la luz del lugar, de las manos aplicadas y de la superficie.';

export const tipoAmbienteSimuladorSchema = z.enum(['interior', 'exterior']);
export type TipoAmbienteSimulador = z.infer<typeof tipoAmbienteSimuladorSchema>;

/** S5: un ambiente de muestra. El dibujo no se declara aquí: es un componente asociado al `id`. */
export const ambienteSimuladorSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  nombre: z.string().min(1),
  tipo: tipoAmbienteSimuladorSchema,
  alt: z.string().min(1),
});
export type AmbienteSimulador = z.infer<typeof ambienteSimuladorSchema>;

export const catalogoAmbientesSchema = z
  .array(ambienteSimuladorSchema)
  .min(1)
  .refine((lista) => new Set(lista.map((a) => a.id)).size === lista.length, 'Hay ambientes con el mismo id');
export type CatalogoAmbientes = z.infer<typeof catalogoAmbientesSchema>;

/** S1, S2: lo que el simulador recibe de M01 y nada más. */
export const simuladorInputSchema = z.object({
  hexadecimal: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  nombre: z.string().min(1),
  codigo: z.string().nullable(),
});
export type SimuladorInput = z.infer<typeof simuladorInputSchema>;
