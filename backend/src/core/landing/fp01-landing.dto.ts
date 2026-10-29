import { z } from 'zod';

/**
 * ============================================================================
 * DTO ESPEJO: Frente Transversal FP-01 — Landing Page y Banners
 * ============================================================================
 * Espejo exacto de `contracts/fp01-landing.contract.ts`.
 */

// ============================================================================
// 1. CONSTANTES Y TIPOS BASE
// ============================================================================

export const MENSAJE_RECURSO_NO_DISPONIBLE_LANDING =
  'El recurso solicitado no está disponible.' as const;

export const PERMISOS_LANDING_BANNERS = {
  ver: 'configuracion.ver',
  editar: 'configuracion.editar',
} as const;

export const ESTADOS_BANNER_INICIO = ['activo', 'inactivo'] as const;

export type EstadoBannerInicio = (typeof ESTADOS_BANNER_INICIO)[number];

export const TIPOS_MIME_BANNER_INICIO = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type TipoMimeBannerInicio = (typeof TIPOS_MIME_BANNER_INICIO)[number];

/** Punto de enfoque de la imagen del banner: porcentajes de 0 a 100 (50 = centro). Decide qué parte se ve cuando se recorta. */
export const focoBannerInicioSchema = z
  .number()
  .int('El punto de enfoque debe ser un número entero')
  .min(0, 'El punto de enfoque no puede ser menor que 0')
  .max(100, 'El punto de enfoque no puede ser mayor que 100');

export const BANNER_INICIO_MAXIMO_BYTES = 5 * 1024 * 1024;

export const CODIGOS_ERROR_LANDING = {
  RECURSO_NO_DISPONIBLE: 'RECURSO_NO_DISPONIBLE',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  IMAGEN_INVALIDA: 'IMAGEN_INVALIDA',
} as const;

export type CodigoErrorLanding =
  (typeof CODIGOS_ERROR_LANDING)[keyof typeof CODIGOS_ERROR_LANDING];

export const estadoBannerInicioSchema = z.enum(ESTADOS_BANNER_INICIO);

export const tipoMimeBannerInicioSchema = z.enum(TIPOS_MIME_BANNER_INICIO);

export const enlaceBannerInicioSchema = z
  .string()
  .trim()
  .min(1, 'El enlace es obligatorio')
  .max(200, 'El enlace no puede superar 200 caracteres')
  .regex(
    /^(\/|https:\/\/)/,
    'El enlace debe ser una ruta interna (/...) o una URL https://',
  );

// ============================================================================
// 2. REQUEST SCHEMAS — ADMINISTRACION DE BANNERS DE INICIO
// ============================================================================

export const crearBannerInicioRequestSchema = z.object({
  tituloLinea1: z
    .string()
    .trim()
    .min(3, 'El título principal debe tener al menos 3 caracteres')
    .max(100, 'El título principal no puede superar 100 caracteres'),
  tituloLinea2: z
    .string()
    .trim()
    .max(100, 'La línea destacada no puede superar 100 caracteres')
    .nullable()
    .optional(),
  descripcion: z
    .string()
    .trim()
    .min(10, 'La descripción debe tener al menos 10 caracteres')
    .max(300, 'La descripción no puede superar 300 caracteres'),
  textoBotonPrimario: z
    .string()
    .trim()
    .min(2, 'El texto del botón principal debe tener al menos 2 caracteres')
    .max(40, 'El texto del botón principal no puede superar 40 caracteres'),
  enlaceBotonPrimario: enlaceBannerInicioSchema,
  textoBotonSecundario: z
    .string()
    .trim()
    .max(40, 'El texto del botón secundario no puede superar 40 caracteres')
    .nullable()
    .optional(),
  enlaceBotonSecundario: enlaceBannerInicioSchema.nullable().optional(),
  imagenBase64: z.string().trim().optional(),
  imagenMimeType: tipoMimeBannerInicioSchema.optional(),
  orden: z
    .number()
    .int('El orden debe ser un número entero')
    .min(0, 'El orden no puede ser negativo')
    .max(9999, 'El orden no puede superar 9999')
    .default(0),
  estado: estadoBannerInicioSchema.default('activo'),
  /** La imagen puede ser de cualquier forma y tamaño: el punto de enfoque dice qué parte conservar al recortarla. */
  focoX: focoBannerInicioSchema.default(50),
  focoY: focoBannerInicioSchema.default(50),
});

export type CrearBannerInicioRequest = z.infer<
  typeof crearBannerInicioRequestSchema
>;

export const editarBannerInicioRequestSchema = z.object({
  tituloLinea1: z
    .string()
    .trim()
    .min(3, 'El título principal debe tener al menos 3 caracteres')
    .max(100, 'El título principal no puede superar 100 caracteres')
    .optional(),
  tituloLinea2: z
    .string()
    .trim()
    .max(100, 'La línea destacada no puede superar 100 caracteres')
    .nullable()
    .optional(),
  descripcion: z
    .string()
    .trim()
    .min(10, 'La descripción debe tener al menos 10 caracteres')
    .max(300, 'La descripción no puede superar 300 caracteres')
    .optional(),
  textoBotonPrimario: z
    .string()
    .trim()
    .min(2, 'El texto del botón principal debe tener al menos 2 caracteres')
    .max(40, 'El texto del botón principal no puede superar 40 caracteres')
    .optional(),
  enlaceBotonPrimario: enlaceBannerInicioSchema.optional(),
  textoBotonSecundario: z
    .string()
    .trim()
    .max(40, 'El texto del botón secundario no puede superar 40 caracteres')
    .nullable()
    .optional(),
  enlaceBotonSecundario: enlaceBannerInicioSchema.nullable().optional(),
  imagenBase64: z.string().trim().optional(),
  imagenMimeType: tipoMimeBannerInicioSchema.optional(),
  orden: z
    .number()
    .int('El orden debe ser un número entero')
    .min(0, 'El orden no puede ser negativo')
    .max(9999, 'El orden no puede superar 9999')
    .optional(),
  focoX: focoBannerInicioSchema.optional(),
  focoY: focoBannerInicioSchema.optional(),
});

export type EditarBannerInicioRequest = z.infer<
  typeof editarBannerInicioRequestSchema
>;

export const cambiarEstadoBannerInicioRequestSchema = z.object({
  estado: estadoBannerInicioSchema,
});

export type CambiarEstadoBannerInicioRequest = z.infer<
  typeof cambiarEstadoBannerInicioRequestSchema
>;

// ============================================================================
// 3. ENTIDADES Y RESPONSE ENVELOPES — PUBLICO Y ADMIN
// ============================================================================

export const bannerInicioPublicoItemSchema = z.object({
  idBanner: z.number().int().positive(),
  tituloLinea1: z.string(),
  tituloLinea2: z.string().nullable(),
  descripcion: z.string(),
  textoBotonPrimario: z.string(),
  enlaceBotonPrimario: z.string(),
  textoBotonSecundario: z.string().nullable(),
  enlaceBotonSecundario: z.string().nullable(),
  tieneImagenPersonalizada: z.boolean(),
  orden: z.number().int().nonnegative(),
  focoX: focoBannerInicioSchema,
  focoY: focoBannerInicioSchema,
});

export type BannerInicioPublicoItem = z.infer<
  typeof bannerInicioPublicoItemSchema
>;

export const listarBannersInicioPublicosResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.array(bannerInicioPublicoItemSchema),
});

export type ListarBannersInicioPublicosResponseEnvelope = z.infer<
  typeof listarBannersInicioPublicosResponseEnvelopeSchema
>;

export const bannerInicioAdminEntitySchema = z.object({
  idBanner: z.number().int().positive(),
  tituloLinea1: z.string(),
  tituloLinea2: z.string().nullable(),
  descripcion: z.string(),
  textoBotonPrimario: z.string(),
  enlaceBotonPrimario: z.string(),
  textoBotonSecundario: z.string().nullable(),
  enlaceBotonSecundario: z.string().nullable(),
  tieneImagenPersonalizada: z.boolean(),
  orden: z.number().int().nonnegative(),
  focoX: focoBannerInicioSchema,
  focoY: focoBannerInicioSchema,
  estado: estadoBannerInicioSchema,
  idAutor: z.number().int().positive().nullable(),
  nombreAutor: z.string().nullable(),
  fechaCreacion: z.string(),
  fechaActualizacion: z.string(),
});

export type BannerInicioAdminEntity = z.infer<
  typeof bannerInicioAdminEntitySchema
>;

export const bannerInicioAdminResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: bannerInicioAdminEntitySchema,
});

export type BannerInicioAdminResponseEnvelope = z.infer<
  typeof bannerInicioAdminResponseEnvelopeSchema
>;

export const listarBannersInicioAdminResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.array(bannerInicioAdminEntitySchema),
});

export type ListarBannersInicioAdminResponseEnvelope = z.infer<
  typeof listarBannersInicioAdminResponseEnvelopeSchema
>;

export const errorLandingEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.enum([
      CODIGOS_ERROR_LANDING.RECURSO_NO_DISPONIBLE,
      CODIGOS_ERROR_LANDING.VALIDATION_ERROR,
      CODIGOS_ERROR_LANDING.IMAGEN_INVALIDA,
    ]),
    message: z.string(),
  }),
});

export type ErrorLandingEnvelope = z.infer<typeof errorLandingEnvelopeSchema>;

// ============================================================================
// 5. IMÁGENES DE LAS TARJETAS DE CATEGORÍAS DEL INICIO
// ============================================================================
// «Explora nuestras categorías» (inicio) muestra una tarjeta por categoría del catálogo (M01). Su imagen la edita el personal.
//
//  C1  Una imagen por categoría, con su punto de enfoque (0 a 100, 50 = centro). Sin imagen, la tarjeta usa su ilustración
//      de respaldo: nunca queda un hueco.
//  C2  `PUT /admin/landing/categorias/:idCategoria/imagen` guarda la imagen (PNG, JPG o WEBP, hasta 5 MB, validada por su
//      firma real y no por la que dice el navegador) y/o el punto de enfoque. Sin `imagenBase64` solo cambia el enfoque y la
//      categoría debe tener ya una imagen. No se exige un tamaño ni una proporción.
//  C3  `DELETE /admin/landing/categorias/:idCategoria/imagen` la quita y la tarjeta vuelve a su ilustración. Idempotente.
//  C4  `GET /admin/landing/categorias` lista TODAS las categorías (con o sin imagen) para el panel.
//  C5  Público: `GET /landing/categorias` lista solo las categorías que tienen imagen, con su enfoque y una `version` (la fecha
//      de la última edición) para que el navegador no reutilice una imagen vieja; `GET /landing/categorias/:idCategoria/imagen`
//      entrega la imagen. Una categoría sin imagen responde 404 genérico.
//  C6  Permisos: los mismos de los banners (`configuracion.ver` para consultar, `configuracion.editar` para guardar o quitar).

export const guardarImagenCategoriaInicioRequestSchema = z
  .object({
    imagenBase64: z.string().min(1, 'La imagen no puede estar vacía').optional(),
    imagenMimeType: tipoMimeBannerInicioSchema.optional(),
    focoX: focoBannerInicioSchema.optional(),
    focoY: focoBannerInicioSchema.optional(),
  })
  .refine((v) => (v.imagenBase64 === undefined) === (v.imagenMimeType === undefined), {
    message: 'La imagen y su tipo se envían juntos',
    path: ['imagenMimeType'],
  });

export type GuardarImagenCategoriaInicioRequest = z.infer<
  typeof guardarImagenCategoriaInicioRequestSchema
>;

export const categoriaInicioPublicaItemSchema = z.object({
  idCategoria: z.number().int().positive(),
  focoX: focoBannerInicioSchema,
  focoY: focoBannerInicioSchema,
  version: z.string(),
});

export type CategoriaInicioPublicaItem = z.infer<
  typeof categoriaInicioPublicaItemSchema
>;

export const listarCategoriasInicioPublicasResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.array(categoriaInicioPublicaItemSchema),
});

export const categoriaInicioAdminEntitySchema = z.object({
  idCategoria: z.number().int().positive(),
  nombre: z.string(),
  tieneImagen: z.boolean(),
  focoX: focoBannerInicioSchema,
  focoY: focoBannerInicioSchema,
  fechaActualizacion: z.string().nullable(),
});

export type CategoriaInicioAdminEntity = z.infer<
  typeof categoriaInicioAdminEntitySchema
>;

export const categoriaInicioAdminResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: categoriaInicioAdminEntitySchema,
});

export const listarCategoriasInicioAdminResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.array(categoriaInicioAdminEntitySchema),
});
