import { z } from 'zod';
import { idSchema, respuestaUno } from '../../m01-catalogo/dtos/m01-catalogo.dto';
import { productoPublicoTarjetaSchema } from '../../m01-catalogo/dtos/m01-catalogo-productos.dto';
import { MAX_COMPLEMENTOS, VISTA_PREVIA_PRODUCTOS } from './m03-asesoria.dto';

/**
 * DTOs del CUESTIONARIO GUIADO (HU-ASE-01), modo `fijo`.
 * Espejo de `contracts/m03-asesoria.contract.ts`.
 *
 * El resultado es el MISMO en los dos modos del contrato (D9): lo que cambia es quién
 * formula las preguntas, no lo que se entrega al final. Por eso `filtroRelajable.idPregunta`
 * es texto, aunque aquí los identificadores sean números.
 */

export const modoCuestionarioSchema = z.enum(['fijo', 'asistido']);
export type ModoCuestionario = z.infer<typeof modoCuestionarioSchema>;

/**
 * Dimensiones que M02 sabe filtrar y que por tanto viajan en la URL del catálogo
 * (contrato · V1, V2). El acabado NO está: M02 todavía no lo filtra.
 */
export const dimensionFiltroSchema = z.enum([
  'categoria',
  'subcategoria',
  'superficie',
  'familia_color',
  'tipo_resina',
  'linea',
]);
export type DimensionFiltro = z.infer<typeof dimensionFiltroSchema>;

/** Dimensiones que admiten el efecto `incluir` y los complementos (R8). */
export const dimensionComplementoSchema = z.enum(['categoria', 'subcategoria']);
export type DimensionComplemento = z.infer<typeof dimensionComplementoSchema>;

export const ambienteAsesoriaSchema = z.enum(['interior', 'exterior']);
export type AmbienteAsesoria = z.infer<typeof ambienteAsesoriaSchema>;

export const origenOpcionesSchema = z.enum(['manual', 'familias_color']);
export type OrigenOpciones = z.infer<typeof origenOpcionesSchema>;

export const filtroCatalogoSchema = z.object({
  dimension: dimensionFiltroSchema,
  idValor: idSchema,
});
export type FiltroCatalogo = z.infer<typeof filtroCatalogoSchema>;

export const filtrosPropuestosSchema = z.object({
  filtros: z.array(filtroCatalogoSchema).max(30),
  ambiente: ambienteAsesoriaSchema.nullable(),
});
export type FiltrosPropuestos = z.infer<typeof filtrosPropuestosSchema>;

export const valorVocabularioSchema = z.object({
  dimension: dimensionFiltroSchema,
  idValor: idSchema,
  nombre: z.string(),
});
export type ValorVocabulario = z.infer<typeof valorVocabularioSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * Efectos de una opción (F2)
 * ─────────────────────────────────────────────────────────────────────────── */

export const efectoOpcionSchema = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('filtrar'), dimension: dimensionFiltroSchema, idObjetivo: idSchema }),
  z.object({ tipo: z.literal('filtrar_ambiente'), ambiente: ambienteAsesoriaSchema }),
  z.object({
    tipo: z.literal('incluir'),
    dimension: dimensionComplementoSchema,
    idObjetivo: idSchema,
    /** Opciones que también deben estar elegidas, p. ej. Metal con Deteriorada. */
    requiereOpciones: z.array(idSchema).max(5).default([]),
  }),
]);
export type EfectoOpcion = z.infer<typeof efectoOpcionSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * Vista pública (R2)
 * ─────────────────────────────────────────────────────────────────────────── */

export const opcionPublicaSchema = z.object({
  idOpcion: idSchema,
  texto: z.string(),
  /** Solo en `familias_color`: la muestra de la familia. */
  hexadecimal: z.string().nullable(),
});
export type OpcionPublica = z.infer<typeof opcionPublicaSchema>;

export const preguntaPublicaSchema = z.object({
  idPregunta: idSchema,
  texto: z.string(),
  origenOpciones: origenOpcionesSchema,
  opciones: z.array(opcionPublicaSchema),
});
export type PreguntaPublica = z.infer<typeof preguntaPublicaSchema>;

export const cuestionarioPublicoSchema = z.object({
  modo: modoCuestionarioSchema,
  preguntas: z.array(preguntaPublicaSchema),
  /** En `asistido` será false cuando la IA no esté disponible (R10, etapa E4). */
  disponible: z.boolean(),
});
export type CuestionarioPublico = z.infer<typeof cuestionarioPublicoSchema>;

/** POST /asesoria/cuestionario/resultado. El orden del arreglo es el de respuesta (R9). */
export const resultadoFijoRequestSchema = z
  .object({
    respuestas: z.array(z.object({ idPregunta: idSchema, idOpcion: idSchema })).max(20),
  })
  .refine((v) => new Set(v.respuestas.map((r) => r.idPregunta)).size === v.respuestas.length, {
    message: 'Cada pregunta se responde una sola vez',
    path: ['respuestas'],
  });
export type ResultadoFijoRequest = z.infer<typeof resultadoFijoRequestSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * Resultado, idéntico en los dos modos (D9)
 * ─────────────────────────────────────────────────────────────────────────── */

export const grupoComplementoSchema = z.object({
  titulo: z.string(),
  rutaCatalogo: z.string(),
  productos: z.array(productoPublicoTarjetaSchema).max(MAX_COMPLEMENTOS),
});
export type GrupoComplemento = z.infer<typeof grupoComplementoSchema>;

export const resultadoCuestionarioSchema = z.object({
  filtrosPropuestos: filtrosPropuestosSchema,
  /** Nombres legibles de lo aplicado, para que se vea con qué se va al catálogo. */
  resumenFiltros: z.array(valorVocabularioSchema),
  /** R5: ruta relativa al catálogo de M02, con sus nombres de parámetro. */
  rutaCatalogo: z.string(),
  total: z.number().int().nonnegative(),
  vistaPrevia: z.array(productoPublicoTarjetaSchema).max(VISTA_PREVIA_PRODUCTOS),
  complementos: z.array(grupoComplementoSchema).max(3),
  sinResultados: z.boolean(),
  /** R9: la última respuesta dada, que la pantalla ofrece quitar. */
  filtroRelajable: z.object({ idPregunta: z.string(), texto: z.string() }).nullable(),
});
export type ResultadoCuestionario = z.infer<typeof resultadoCuestionarioSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * Panel de administración (F1)
 * ─────────────────────────────────────────────────────────────────────────── */

export const textoPreguntaSchema = z
  .string()
  .trim()
  .min(3, 'La pregunta debe tener al menos 3 caracteres')
  .max(200, 'La pregunta no puede pasar de 200 caracteres');

export const textoOpcionSchema = z
  .string()
  .trim()
  .min(1, 'Escribe el texto de la opción')
  .max(100, 'La opción no puede pasar de 100 caracteres');

export const ordenCampoSchema = z.number().int('El orden debe ser un número entero').min(0).max(10_000);

export const opcionAdminSchema = z.object({
  idOpcion: idSchema,
  texto: z.string(),
  orden: z.number().int(),
  activa: z.boolean(),
  efectos: z.array(efectoOpcionSchema),
});
export type OpcionAdmin = z.infer<typeof opcionAdminSchema>;

export const preguntaAdminSchema = z.object({
  idPregunta: idSchema,
  texto: z.string(),
  orden: z.number().int(),
  activa: z.boolean(),
  origenOpciones: origenOpcionesSchema,
  /** Vacío en `familias_color`: esas opciones son el catálogo de familias (F3). */
  opciones: z.array(opcionAdminSchema),
});
export type PreguntaAdmin = z.infer<typeof preguntaAdminSchema>;

export const cuestionarioAdminSchema = z.object({
  modo: modoCuestionarioSchema,
  preguntas: z.array(preguntaAdminSchema),
  /** Lo que el administrador puede elegir como objetivo de un efecto (F4). */
  vocabulario: z.array(valorVocabularioSchema),
});
export type CuestionarioAdmin = z.infer<typeof cuestionarioAdminSchema>;

export const crearPreguntaRequestSchema = z.object({
  texto: textoPreguntaSchema,
  orden: ordenCampoSchema,
  origenOpciones: origenOpcionesSchema.default('manual'),
});
export type CrearPreguntaRequest = z.infer<typeof crearPreguntaRequestSchema>;

export const editarPreguntaRequestSchema = z
  .object({ texto: textoPreguntaSchema, orden: ordenCampoSchema, activa: z.boolean() })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'Indica al menos un cambio' });
export type EditarPreguntaRequest = z.infer<typeof editarPreguntaRequestSchema>;

export const crearOpcionRequestSchema = z.object({
  texto: textoOpcionSchema,
  orden: ordenCampoSchema,
});
export type CrearOpcionRequest = z.infer<typeof crearOpcionRequestSchema>;

export const editarOpcionRequestSchema = z
  .object({ texto: textoOpcionSchema, orden: ordenCampoSchema, activa: z.boolean() })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'Indica al menos un cambio' });
export type EditarOpcionRequest = z.infer<typeof editarOpcionRequestSchema>;

/** PUT /admin/asesoria/opciones/:idOpcion/efectos — reemplaza el conjunto completo. */
export const reemplazarEfectosRequestSchema = z.object({
  efectos: z.array(efectoOpcionSchema).max(10, 'Como máximo 10 efectos por opción'),
});
export type ReemplazarEfectosRequest = z.infer<typeof reemplazarEfectosRequestSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * Configuración (D8)
 * ─────────────────────────────────────────────────────────────────────────── */

export const guionSchema = z.string().trim().max(4000, 'El guion no puede pasar de 4000 caracteres');

export const configuracionAsesoriaSchema = z.object({
  modoCuestionario: modoCuestionarioSchema,
  manosPorDefecto: z.number().int().min(1).max(10).nullable(),
  guionCuestionario: z.string(),
  guionAsistente: z.string(),
  iaTiempoEsperaMs: z.number().int(),
  iaReintentos: z.number().int(),
  iaSuspensionCuotaMinutos: z.number().int(),
  iaRetencionIncidentesDias: z.number().int(),
  iaFallosConsecutivosAlerta: z.number().int(),
  fechaActualizacion: z.string(),
});
export type ConfiguracionAsesoria = z.infer<typeof configuracionAsesoriaSchema>;

export const editarConfiguracionRequestSchema = z
  .object({
    modoCuestionario: modoCuestionarioSchema,
    manosPorDefecto: z
      .number()
      .int('Las manos deben ser un número entero')
      .min(1, 'Indica al menos una mano')
      .max(10, 'Como máximo 10 manos')
      .nullable(),
    guionCuestionario: guionSchema,
    guionAsistente: guionSchema,
    iaTiempoEsperaMs: z
      .number()
      .int()
      .min(1000, 'El tiempo de espera mínimo es 1000 ms')
      .max(60_000, 'El tiempo de espera máximo es 60 000 ms'),
    iaReintentos: z.number().int().min(0).max(5, 'Como máximo 5 reintentos'),
    iaSuspensionCuotaMinutos: z.number().int().min(1).max(1440, 'Como máximo 1440 minutos'),
    iaRetencionIncidentesDias: z.number().int().min(1).max(3650, 'Como máximo 3650 días'),
    iaFallosConsecutivosAlerta: z.number().int().min(1, 'Indica al menos un fallo').max(100),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'Indica al menos un cambio' });
export type EditarConfiguracionRequest = z.infer<typeof editarConfiguracionRequestSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * Envelopes
 * ─────────────────────────────────────────────────────────────────────────── */

export const cuestionarioPublicoResponseEnvelopeSchema = respuestaUno(cuestionarioPublicoSchema);
export type CuestionarioPublicoResponseEnvelope = z.infer<typeof cuestionarioPublicoResponseEnvelopeSchema>;

export const resultadoCuestionarioResponseEnvelopeSchema = respuestaUno(resultadoCuestionarioSchema);
export type ResultadoCuestionarioResponseEnvelope = z.infer<typeof resultadoCuestionarioResponseEnvelopeSchema>;

export const cuestionarioAdminResponseEnvelopeSchema = respuestaUno(cuestionarioAdminSchema);
export type CuestionarioAdminResponseEnvelope = z.infer<typeof cuestionarioAdminResponseEnvelopeSchema>;

export const preguntaAdminResponseEnvelopeSchema = respuestaUno(preguntaAdminSchema);
export type PreguntaAdminResponseEnvelope = z.infer<typeof preguntaAdminResponseEnvelopeSchema>;

export const opcionAdminResponseEnvelopeSchema = respuestaUno(opcionAdminSchema);
export type OpcionAdminResponseEnvelope = z.infer<typeof opcionAdminResponseEnvelopeSchema>;

export const configuracionAsesoriaResponseEnvelopeSchema = respuestaUno(configuracionAsesoriaSchema);
export type ConfiguracionAsesoriaResponseEnvelope = z.infer<typeof configuracionAsesoriaResponseEnvelopeSchema>;
