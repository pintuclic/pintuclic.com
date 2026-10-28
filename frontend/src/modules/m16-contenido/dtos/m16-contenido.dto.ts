import { z } from 'zod';

export const SLUG_PAGINA_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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

export const estadoPaginaContenidoSchema = z.enum([
  'borrador',
  'publicado',
  'archivado',
]);

export const estadoFaqSchema = z.enum(['activo', 'inactivo']);

export const paginaFormSchema = z.object({
  titulo: z
    .string()
    .trim()
    .min(3, 'El título debe tener al menos 3 caracteres')
    .max(160, 'El título no puede superar 160 caracteres'),
  slug: z
    .string()
    .trim()
    .min(2, 'El slug debe tener al menos 2 caracteres')
    .max(120, 'El slug no puede superar 120 caracteres')
    .regex(
      SLUG_PAGINA_REGEX,
      'Usa solo minúsculas, números y guiones intermedios (ej. sobre-nosotros)',
    ),
  resumen: z
    .string()
    .trim()
    .max(300, 'El resumen no puede superar 300 caracteres'),
  cuerpoMarkdown: z
    .string()
    .trim()
    .min(10, 'El contenido debe tener al menos 10 caracteres')
    .max(50000, 'El contenido no puede superar 50000 caracteres'),
  estado: estadoPaginaContenidoSchema,
});

export type PaginaFormValues = z.infer<typeof paginaFormSchema>;

export const faqFormSchema = z.object({
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
    .number({ error: 'Ingresa un número entero válido' })
    .int('El orden debe ser un número entero')
    .min(0, 'El orden no puede ser negativo')
    .max(9999, 'El orden no puede superar 9999'),
  estado: estadoFaqSchema,
});

export type FaqFormValues = z.infer<typeof faqFormSchema>;

// ============================================================================
// 8. CONTACTO DEL SITIO (HU-CON-05)
// ============================================================================
//
// Los datos de contacto del pie de página (dirección, teléfono, correo y redes) los edita el personal desde el panel de
// contenido y los lee el sitio público. Es una sola ficha (no una lista): lo que no se llena, no se muestra.
//
// Reglas (R9–R12):
// - R9: Una sola ficha. `GET /api/v1/contenido/contacto` (público, sin sesión) devuelve siempre la ficha con todos sus
//       campos; los que no se han llenado vienen en `null`. El pie de página no pinta lo que viene vacío.
// - R10: `GET` y `PUT /api/v1/admin/contenido/contacto` exigen `configuracion.ver` y `configuracion.editar` (D1). Sin el
//        permiso, 404 opaco (R5). `PUT` reemplaza la ficha completa; un campo que no viene o viene vacío se borra.
// - R11: Las redes solo admiten enlaces `https://` (nunca `javascript:`, `data:` ni `http://`). El teléfono admite dígitos,
//        espacios, `+`, `-`, paréntesis y `.`; el correo debe ser un correo válido.
// - R12: Se registra quién y cuándo la editó (R6); el público nunca recibe esos datos (R4).

export const CONTACTO_DIRECCION_MAX = 200 as const;

const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `No puede superar ${String(max)} caracteres`)
    .nullish()
    .transform((v) => (v === undefined || v === null || v === '' ? null : v));

const redSocialSchema = z
  .string()
  .trim()
  .max(300, 'El enlace no puede superar 300 caracteres')
  .nullish()
  .transform((v) => (v === undefined || v === null || v === '' ? null : v))
  .refine((v) => v === null || /^https:\/\/[^\s]+$/i.test(v), {
    message: 'El enlace debe empezar por https://',
  });

/** PUT /admin/contenido/contacto — reemplaza la ficha completa (R10). */
export const editarContactoRequestSchema = z.object({
  direccion: textoOpcional(CONTACTO_DIRECCION_MAX),
  telefono: z
    .string()
    .trim()
    .max(30, 'El teléfono no puede superar 30 caracteres')
    .nullish()
    .transform((v) => (v === undefined || v === null || v === '' ? null : v))
    .refine((v) => v === null || /^[0-9+()\-.\s]{5,30}$/.test(v), {
      message: 'El teléfono solo puede tener números, espacios y los signos + - ( ) .',
    }),
  correo: z
    .string()
    .trim()
    .max(150, 'El correo no puede superar 150 caracteres')
    .nullish()
    .transform((v) => (v === undefined || v === null || v === '' ? null : v))
    .refine((v) => v === null || z.string().email().safeParse(v).success, {
      message: 'Escriba un correo válido',
    }),
  facebook: redSocialSchema,
  instagram: redSocialSchema,
  youtube: redSocialSchema,
  tiktok: redSocialSchema,
});

export type EditarContactoRequest = z.infer<typeof editarContactoRequestSchema>;

/** La ficha tal como la recibe el sitio público (R9). */
export const contactoPublicoSchema = z.object({
  direccion: z.string().nullable(),
  telefono: z.string().nullable(),
  correo: z.string().nullable(),
  facebook: z.string().nullable(),
  instagram: z.string().nullable(),
  youtube: z.string().nullable(),
  tiktok: z.string().nullable(),
});

export type ContactoPublico = z.infer<typeof contactoPublicoSchema>;

export const contactoPublicoResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: contactoPublicoSchema,
});

export type ContactoPublicoResponseEnvelope = z.infer<typeof contactoPublicoResponseEnvelopeSchema>;

/** La ficha para el panel: lo mismo y cuándo y quién la editó por última vez. */
export const contactoAdminEntitySchema = contactoPublicoSchema.extend({
  fechaActualizacion: z.string().nullable(),
  actualizadoPor: z.string().nullable(),
});

export type ContactoAdminEntity = z.infer<typeof contactoAdminEntitySchema>;

export const contactoAdminResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: contactoAdminEntitySchema,
});

export type ContactoAdminResponseEnvelope = z.infer<typeof contactoAdminResponseEnvelopeSchema>;
