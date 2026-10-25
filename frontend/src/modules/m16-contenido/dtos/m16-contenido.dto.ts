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
