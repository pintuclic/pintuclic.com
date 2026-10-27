import { z } from 'zod';
import { idSchema, respuestaPaginada, respuestaUno } from '../../m01-catalogo/dtos/m01-catalogo.dto';

/**
 * DTOs de M03 — Asesoría y asistencia.
 * Espejo de `contracts/m03-asesoria.contract.ts`, que es la especificación del módulo.
 * Esta entrega cubre la CALCULADORA (HU-ASE-02); el cuestionario y el asistente llegan
 * en las etapas E3 y E4 del contrato.
 */

/* ───────────────────────────────────────────────────────────────────────────
 * CONSTANTES Y CÓDIGOS DE ERROR
 * ─────────────────────────────────────────────────────────────────────────── */

export const ADVERTENCIA_CALCULO =
  'La cantidad es aproximada: el rendimiento real depende del estado y la absorción de la superficie.';

export const CODIGOS_ERROR_M03 = {
  PARAMETRO_INVALIDO: 'PARAMETRO_INVALIDO',
  RECURSO_NO_DISPONIBLE: 'RECURSO_NO_DISPONIBLE',
} as const;

/* ───────────────────────────────────────────────────────────────────────────
 * VALIDACIÓN DE ENTRADA (M03 · K8)
 *
 * Los mensajes son los que ve la persona: dicen qué falta, sin jerga interna
 * (AGENTS.md). El formulario los muestra antes de enviar y el servidor los
 * repite si llega algo que no cumple.
 * ─────────────────────────────────────────────────────────────────────────── */

/** Dos decimales como máximo, comprobado sobre el valor exacto en centésimas. */
const dosDecimales = (v: number): boolean => Number.isInteger(Math.round(v * 100)) && Math.abs(v * 100 - Math.round(v * 100)) < 1e-9;

export const areaSchema = z
  .number({ error: 'Indica el área a pintar en metros cuadrados' })
  .gt(0, 'El área debe ser mayor que cero')
  .max(100_000, 'El área no puede pasar de 100 000 m²')
  .refine(dosDecimales, 'Usa como máximo dos decimales');

export const manosSchema = z
  .number({ error: 'Indica cuántas manos vas a dar' })
  .int('Las manos deben ser un número entero')
  .min(1, 'Indica al menos una mano')
  .max(10, 'Como máximo 10 manos');

export const unidadesSchema = z
  .number({ error: 'Indica cuántas unidades tienes' })
  .int('Las unidades deben ser un número entero')
  .min(1, 'Indica al menos una unidad')
  .max(1000, 'Como máximo 1000 unidades');

export const sentidoCalculoSchema = z.enum(['cantidad', 'cobertura']);
export type SentidoCalculo = z.infer<typeof sentidoCalculoSchema>;

/** GET /asesoria/calculadora/productos */
export const listarProductosCalculablesQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(48).default(20),
});
export type ListarProductosCalculablesQuery = z.infer<typeof listarProductosCalculablesQuerySchema>;

/** POST /asesoria/calculadora/calcular (M03 · K3, K4) */
export const calcularRequestSchema = z.discriminatedUnion('sentido', [
  z.object({
    sentido: z.literal('cantidad'),
    idProducto: idSchema,
    idVariante: idSchema,
    area: areaSchema,
    manos: manosSchema,
  }),
  z.object({
    sentido: z.literal('cobertura'),
    idProducto: idSchema,
    idVariante: idSchema,
    unidades: unidadesSchema,
    manos: manosSchema,
  }),
]);
export type CalcularRequest = z.infer<typeof calcularRequestSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * SALIDA
 * ─────────────────────────────────────────────────────────────────────────── */

export const productoCalculableSchema = z.object({
  idProducto: idSchema,
  nombre: z.string(),
  marca: z.string(),
});
export type ProductoCalculable = z.infer<typeof productoCalculableSchema>;

/** Una presentación con volumen y su rendimiento derivado (M03 · K2), por unidad y por mano. */
export const presentacionCalculableSchema = z.object({
  idVariante: idSchema,
  presentacion: z.string(),
  volumenGalones: z.number().positive(),
  rendimientoMin: z.number().positive(),
  rendimientoMax: z.number().positive(),
});
export type PresentacionCalculable = z.infer<typeof presentacionCalculableSchema>;

export const calculadoraProductoSchema = z.object({
  idProducto: idSchema,
  nombre: z.string(),
  /** m² por galón y por mano, tal como lo registró M01. */
  rendimientoMin: z.number().positive(),
  rendimientoMax: z.number().positive(),
  /** K9: sugerencia; null si no hay ninguna. El campo del formulario nace vacío igual. */
  manosSugeridas: z.number().int().min(1).max(10).nullable(),
  presentaciones: z.array(presentacionCalculableSchema).min(1),
  advertencia: z.string(),
});
export type CalculadoraProducto = z.infer<typeof calculadoraProductoSchema>;

/** `cantidad`: unidades enteras (K3). `cobertura`: m² con un decimal (K4). */
export const resultadoPresentacionSchema = z.object({
  idVariante: idSchema,
  presentacion: z.string(),
  minimo: z.number().nonnegative(),
  maximo: z.number().nonnegative(),
});
export type ResultadoPresentacion = z.infer<typeof resultadoPresentacionSchema>;

export const resultadoCalculoSchema = z.object({
  sentido: sentidoCalculoSchema,
  seleccionada: resultadoPresentacionSchema,
  /** K6: solo en `cantidad`; vacío en `cobertura`. */
  equivalencias: z.array(resultadoPresentacionSchema),
  advertencia: z.string(),
});
export type ResultadoCalculo = z.infer<typeof resultadoCalculoSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * ENVELOPES
 * ─────────────────────────────────────────────────────────────────────────── */

export const productosCalculablesResponseEnvelopeSchema = respuestaPaginada(productoCalculableSchema);
export type ProductosCalculablesResponseEnvelope = z.infer<typeof productosCalculablesResponseEnvelopeSchema>;

export const calculadoraProductoResponseEnvelopeSchema = respuestaUno(calculadoraProductoSchema);
export type CalculadoraProductoResponseEnvelope = z.infer<typeof calculadoraProductoResponseEnvelopeSchema>;

export const resultadoCalculoResponseEnvelopeSchema = respuestaUno(resultadoCalculoSchema);
export type ResultadoCalculoResponseEnvelope = z.infer<typeof resultadoCalculoResponseEnvelopeSchema>;
