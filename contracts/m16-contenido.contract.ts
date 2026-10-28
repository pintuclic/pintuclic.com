import { z } from 'zod';

/**
 * ============================================================================
 * CONTRATO DE API REST: Módulo M16 — Contenido Institucional y FAQ
 * ============================================================================
 * Scope: m16-contenido · Ola 2 (Catálogo y vitrina)
 * Predecesores de construcción: M20 (m20-seguridad), M17 (m17-permisos)
 * Consumidores por puerto: M15 (m15-atencion) consume el catálogo publicado de FAQ
 *
 * Historias de Usuario cubiertas:
 * - HU-CON-01: Gestión administrativa de páginas institucionales (crear, editar,
 *              cambiar estado borrador/publicado/archivado, listar y ver detalle).
 * - HU-CON-02: Gestión administrativa de preguntas frecuentes / FAQ (crear, editar,
 *              activar/inactivar, reordenar y listar).
 * - HU-CON-03: Consulta pública de páginas institucionales publicadas por slug
 *              (Sobre Nosotros con misión/visión/horarios, Términos y Condiciones,
 *              Política de Privacidad, Políticas de Envío) y listado público.
 * - HU-CON-04: Consulta pública del Centro de Ayuda / Preguntas Frecuentes (FAQ)
 *              activas ordenadas por `orden ASC, idFaq ASC`, y exposición por puerto
 *              hacia M15 (Atención al Cliente).
 *
 * Reglas de negocio y seguridad (R1–R8):
 * - R1: El `slug` de una página institucional es único, en minúsculas y kebab-case
 *       (`^[a-z0-9]+(?:-[a-z0-9]+)*$`). Se normaliza antes de persistir o consultar.
 * - R2: Las páginas en estado `borrador` o `archivado` nunca son visibles en rutas
 *       públicas; cualquier consulta pública sobre ellas responde HTTP 404 con el
 *       mensaje opaco estándar `RECURSO_NO_DISPONIBLE` (ADR-003 / RN-SEG-08).
 * - R3: Las entradas de FAQ en estado `inactivo` nunca se exponen en la vista pública
 *       ni en el puerto consumido por M15.
 * - R4: Los endpoints públicos (`/api/v1/contenido/*`) jamás exponen `idAutor`,
 *       correos de administradores ni estados internos de edición (`HU-SEG-06`).
 * - R5: Todo intento de acceso a `/api/v1/admin/contenido/*` sin sesión válida o sin
 *       el permiso requerido devuelve HTTP 404 opaco (`RECURSO_NO_DISPONIBLE`) y
 *       registra el evento en `AuditoriaPort` (`ADR-002` / `ADR-003`).
 * - R6: Toda mutación administrativa registra `id_autor` (FK a `usuario.id_usuario`)
 *       y actualiza `fecha_actualizacion`.
 * - R7: M16 NO toca ni modifica la tabla `aviso_privacidad` ni `consentimiento_usuario`
 *       (dominio exclusivo de M20 Habeas Data). La página institucional con slug
 *       `politica-de-privacidad` es contenido editorial informativo de vitrina.
 * - R8: Prohibido `any` en todo el módulo (Regla de Oro #4).
 *
 * Decisiones de diseño (D1–D4):
 * - D1 (Permisos M17): Se reutilizan los permisos atómicos existentes en M17
 *      `configuracion.ver` (lectura administrativa) y `configuracion.editar`
 *      (creación, edición, cambio de estado y orden), siguiendo el patrón de D1
 *      aplicado en M01 y M13 sobre el catálogo maestro de permisos.
 * - D2 (Formato de cuerpo): El cuerpo de las páginas (`cuerpoMarkdown`) y las
 *      respuestas de FAQ (`respuestaMarkdown`) se almacenan en Markdown limpio y se
 *      renderizan en el frontend sin inyección de HTML crudo (`dangerouslySetInnerHTML`
 *      prohibido).
 * - D3 (Semilla inicial en BD): Las 4 páginas institucionales enlazadas por el
 *      Header/Footer oficial (`sobre-nosotros`, `terminos-y-condiciones`,
 *      `politica-de-privacidad`, `politicas-de-envio`) y las preguntas frecuentes
 *      iniciales viven exclusivamente en `bd/sql/seed_pintuclic.sql` (prohibido
 *      sembrar datos desde código TypeScript).
 * - D4 (Puerto para M15): `ContenidoFaqPort` en `interfaces/contenido-faq.port.ts`
 *      expone `listarFaqPublicas()` libre de código de ejecución (0 bytes runtime).
 */

// ============================================================================
// 1. CONSTANTES CONGELADAS Y NORMALIZADORES
// ============================================================================

export const MENSAJE_RECURSO_NO_DISPONIBLE =
  'El recurso solicitado no está disponible.' as const;

export const PERMISOS_CONTENIDO = {
  ver: 'configuracion.ver',
  editar: 'configuracion.editar',
} as const;

export const ESTADOS_PAGINA_CONTENIDO = [
  'borrador',
  'publicado',
  'archivado',
] as const;

export type EstadoPaginaContenido = (typeof ESTADOS_PAGINA_CONTENIDO)[number];

export const ESTADOS_FAQ = ['activo', 'inactivo'] as const;

export type EstadoFaq = (typeof ESTADOS_FAQ)[number];

export const CODIGOS_ERROR_CONTENIDO = {
  RECURSO_NO_DISPONIBLE: 'RECURSO_NO_DISPONIBLE',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SLUG_DUPLICADO: 'SLUG_DUPLICADO',
  ESTADO_INVALIDO: 'ESTADO_INVALIDO',
} as const;

export type CodigoErrorContenido =
  (typeof CODIGOS_ERROR_CONTENIDO)[keyof typeof CODIGOS_ERROR_CONTENIDO];

export const SLUG_PAGINA_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Normaliza un texto o slug hacia formato kebab-case estricto (sin tildes ni caracteres especiales).
 */
export function normalizarSlugPagina(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

// ============================================================================
// 2. ESQUEMAS BASE Y PARÁMETROS
// ============================================================================

export const estadoPaginaContenidoSchema = z.enum(ESTADOS_PAGINA_CONTENIDO);

export const estadoFaqSchema = z.enum(ESTADOS_FAQ);

export const slugPaginaSchema = z
  .string()
  .trim()
  .min(2, 'El slug debe tener al menos 2 caracteres')
  .max(120, 'El slug no puede superar 120 caracteres')
  .regex(
    SLUG_PAGINA_REGEX,
    'El slug solo permite letras minúsculas, números y guiones intermedios (ej. sobre-nosotros)',
  );

export const filtroPaginasAdminQuerySchema = z.object({
  estado: estadoPaginaContenidoSchema.optional(),
  busqueda: z.string().trim().max(120).optional(),
});

export type FiltroPaginasAdminQuery = z.infer<typeof filtroPaginasAdminQuerySchema>;

export const filtroFaqAdminQuerySchema = z.object({
  estado: estadoFaqSchema.optional(),
  busqueda: z.string().trim().max(120).optional(),
});

export type FiltroFaqAdminQuery = z.infer<typeof filtroFaqAdminQuerySchema>;

// ============================================================================
// 3. REQUEST SCHEMAS — ADMINISTRACIÓN DE PÁGINAS INSTITUCIONALES (HU-CON-01)
// ============================================================================

export const crearPaginaRequestSchema = z.object({
  slug: slugPaginaSchema,
  titulo: z
    .string()
    .trim()
    .min(3, 'El título debe tener al menos 3 caracteres')
    .max(160, 'El título no puede superar 160 caracteres'),
  resumen: z
    .string()
    .trim()
    .max(300, 'El resumen no puede superar 300 caracteres')
    .nullable()
    .optional(),
  cuerpoMarkdown: z
    .string()
    .trim()
    .min(10, 'El contenido de la página debe tener al menos 10 caracteres')
    .max(50000, 'El contenido de la página no puede superar 50000 caracteres'),
  estado: estadoPaginaContenidoSchema.default('borrador'),
});

export type CrearPaginaRequest = z.infer<typeof crearPaginaRequestSchema>;

export const editarPaginaRequestSchema = z.object({
  slug: slugPaginaSchema.optional(),
  titulo: z
    .string()
    .trim()
    .min(3, 'El título debe tener al menos 3 caracteres')
    .max(160, 'El título no puede superar 160 caracteres')
    .optional(),
  resumen: z
    .string()
    .trim()
    .max(300, 'El resumen no puede superar 300 caracteres')
    .nullable()
    .optional(),
  cuerpoMarkdown: z
    .string()
    .trim()
    .min(10, 'El contenido de la página debe tener al menos 10 caracteres')
    .max(50000, 'El contenido de la página no puede superar 50000 caracteres')
    .optional(),
});

export type EditarPaginaRequest = z.infer<typeof editarPaginaRequestSchema>;

export const cambiarEstadoPaginaRequestSchema = z.object({
  estado: estadoPaginaContenidoSchema,
});

export type CambiarEstadoPaginaRequest = z.infer<
  typeof cambiarEstadoPaginaRequestSchema
>;

// ============================================================================
// 4. REQUEST SCHEMAS — ADMINISTRACIÓN DE FAQ (HU-CON-02)
// ============================================================================

export const crearFaqRequestSchema = z.object({
  pregunta: z
    .string()
    .trim()
    .min(5, 'La pregunta debe tener al menos 5 caracteres')
    .max(240, 'La pregunta no puede superar 240 caracteres'),
  respuestaMarkdown: z
    .string()
    .trim()
    .min(5, 'La respuesta debe tener al menos 5 caracteres')
    .max(10000, 'La respuesta no puede superar 10000 caracteres'),
  orden: z
    .number()
    .int('El orden debe ser un número entero')
    .min(0, 'El orden no puede ser negativo')
    .max(9999, 'El orden no puede superar 9999')
    .default(0),
  estado: estadoFaqSchema.default('activo'),
});

export type CrearFaqRequest = z.infer<typeof crearFaqRequestSchema>;

export const editarFaqRequestSchema = z.object({
  pregunta: z
    .string()
    .trim()
    .min(5, 'La pregunta debe tener al menos 5 caracteres')
    .max(240, 'La pregunta no puede superar 240 caracteres')
    .optional(),
  respuestaMarkdown: z
    .string()
    .trim()
    .min(5, 'La respuesta debe tener al menos 5 caracteres')
    .max(10000, 'La respuesta no puede superar 10000 caracteres')
    .optional(),
  orden: z
    .number()
    .int('El orden debe ser un número entero')
    .min(0, 'El orden no puede ser negativo')
    .max(9999, 'El orden no puede superar 9999')
    .optional(),
});

export type EditarFaqRequest = z.infer<typeof editarFaqRequestSchema>;

export const cambiarEstadoFaqRequestSchema = z.object({
  estado: estadoFaqSchema,
});

export type CambiarEstadoFaqRequest = z.infer<typeof cambiarEstadoFaqRequestSchema>;

export const cambiarOrdenFaqRequestSchema = z.object({
  orden: z
    .number()
    .int('El orden debe ser un número entero')
    .min(0, 'El orden no puede ser negativo')
    .max(9999, 'El orden no puede superar 9999'),
});

export type CambiarOrdenFaqRequest = z.infer<typeof cambiarOrdenFaqRequestSchema>;

// ============================================================================
// 5. ENTIDADES Y RESPONSE ENVELOPES — PÚBLICO (HU-CON-03, HU-CON-04)
// ============================================================================

/**
 * Resumen público de página institucional para menús/listados de vitrina (sin cuerpo pesado ni datos de autor).
 */
export const paginaPublicaResumenSchema = z.object({
  slug: z.string(),
  titulo: z.string(),
  resumen: z.string().nullable(),
  fechaActualizacion: z.string(),
});

export type PaginaPublicaResumen = z.infer<typeof paginaPublicaResumenSchema>;

/**
 * Detalle público de página institucional publicada (HU-CON-03 / HU-SEG-06: sin idAutor ni estado interno).
 */
export const paginaPublicaDetalleSchema = z.object({
  slug: z.string(),
  titulo: z.string(),
  resumen: z.string().nullable(),
  cuerpoMarkdown: z.string(),
  fechaActualizacion: z.string(),
});

export type PaginaPublicaDetalle = z.infer<typeof paginaPublicaDetalleSchema>;

/**
 * Entrada pública de pregunta frecuente activa (HU-CON-04 / Puerto hacia M15).
 */
export const faqPublicaItemSchema = z.object({
  idFaq: z.number().int().positive(),
  pregunta: z.string(),
  respuestaMarkdown: z.string(),
  orden: z.number().int().nonnegative(),
});

export type FaqPublicaItem = z.infer<typeof faqPublicaItemSchema>;

export const paginaPublicaResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: paginaPublicaDetalleSchema,
});

export type PaginaPublicaResponseEnvelope = z.infer<
  typeof paginaPublicaResponseEnvelopeSchema
>;

export const listarPaginasPublicasResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.array(paginaPublicaResumenSchema),
});

export type ListarPaginasPublicasResponseEnvelope = z.infer<
  typeof listarPaginasPublicasResponseEnvelopeSchema
>;

export const listarFaqPublicasResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.array(faqPublicaItemSchema),
});

export type ListarFaqPublicasResponseEnvelope = z.infer<
  typeof listarFaqPublicasResponseEnvelopeSchema
>;

// ============================================================================
// 6. ENTIDADES Y RESPONSE ENVELOPES — ADMINISTRACIÓN (HU-CON-01, HU-CON-02)
// ============================================================================

export const paginaAdminEntitySchema = z.object({
  idPagina: z.number().int().positive(),
  slug: z.string(),
  titulo: z.string(),
  resumen: z.string().nullable(),
  cuerpoMarkdown: z.string(),
  estado: estadoPaginaContenidoSchema,
  idAutor: z.number().int().positive().nullable(),
  nombreAutor: z.string().nullable(),
  fechaCreacion: z.string(),
  fechaActualizacion: z.string(),
});

export type PaginaAdminEntity = z.infer<typeof paginaAdminEntitySchema>;

export const faqAdminEntitySchema = z.object({
  idFaq: z.number().int().positive(),
  pregunta: z.string(),
  respuestaMarkdown: z.string(),
  orden: z.number().int().nonnegative(),
  estado: estadoFaqSchema,
  idAutor: z.number().int().positive().nullable(),
  nombreAutor: z.string().nullable(),
  fechaCreacion: z.string(),
  fechaActualizacion: z.string(),
});

export type FaqAdminEntity = z.infer<typeof faqAdminEntitySchema>;

export const paginaAdminResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: paginaAdminEntitySchema,
});

export type PaginaAdminResponseEnvelope = z.infer<
  typeof paginaAdminResponseEnvelopeSchema
>;

export const listarPaginasAdminResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.array(paginaAdminEntitySchema),
});

export type ListarPaginasAdminResponseEnvelope = z.infer<
  typeof listarPaginasAdminResponseEnvelopeSchema
>;

export const faqAdminResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: faqAdminEntitySchema,
});

export type FaqAdminResponseEnvelope = z.infer<typeof faqAdminResponseEnvelopeSchema>;

export const listarFaqAdminResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.array(faqAdminEntitySchema),
});

export type ListarFaqAdminResponseEnvelope = z.infer<
  typeof listarFaqAdminResponseEnvelopeSchema
>;

// ============================================================================
// 7. ENVELOPE DE ERROR ESTÁNDAR (ADR-003)
// ============================================================================

export const errorContenidoEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.enum([
      CODIGOS_ERROR_CONTENIDO.RECURSO_NO_DISPONIBLE,
      CODIGOS_ERROR_CONTENIDO.VALIDATION_ERROR,
      CODIGOS_ERROR_CONTENIDO.SLUG_DUPLICADO,
      CODIGOS_ERROR_CONTENIDO.ESTADO_INVALIDO,
    ]),
    message: z.string(),
  }),
});

export type ErrorContenidoEnvelope = z.infer<typeof errorContenidoEnvelopeSchema>;
