import { z } from 'zod';

/** Formularios de M21 (Directiva #12: ningún esquema Zod vive dentro de un `.tsx`). */

/** Pedir la cotización desde el carrito: comentario opcional. */
export const solicitarFormSchema = z.object({
  comentario: z.string().trim().max(500, 'El comentario admite hasta 500 caracteres.'),
});
export type SolicitarFormData = z.infer<typeof solicitarFormSchema>;

/** El cliente rechaza: motivo opcional. */
export const rechazoClienteFormSchema = z.object({
  motivo: z.string().trim().max(500, 'El motivo admite hasta 500 caracteres.'),
});
export type RechazoClienteFormData = z.infer<typeof rechazoClienteFormSchema>;

/** El panel rechaza: motivo obligatorio (R7). */
export const rechazoAdminFormSchema = z.object({
  motivo: z
    .string()
    .trim()
    .min(3, 'Escribe el motivo del rechazo (mínimo 3 caracteres).')
    .max(500, 'El motivo admite hasta 500 caracteres.'),
});
export type RechazoAdminFormData = z.infer<typeof rechazoAdminFormSchema>;

/** Una fila del editor del panel: los campos llegan como texto desde los inputs. */
export const lineaAjusteFormSchema = z.object({
  idLinea: z.number().int().positive(),
  /** false = se quita de la cotización al guardar (R5). */
  incluida: z.boolean(),
  cantidad: z
    .string()
    .trim()
    .refine((v) => /^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 9_999, { message: 'La cantidad va de 1 a 9.999.' }),
  /** Vacío = todavía sin precio. */
  precio: z
    .string()
    .trim()
    .refine((v) => v === '' || (/^\d+(\.\d{1,2})?$/.test(v) && Number(v) <= 9_999_999_999.99), {
      message: 'Escribe un precio válido, con hasta 2 decimales.',
    }),
});
export type LineaAjusteFormData = z.infer<typeof lineaAjusteFormSchema>;

/** Editor del panel (R5): líneas, nota para el cliente y vencimiento. */
export const editorFormSchema = z.object({
  lineas: z.array(lineaAjusteFormSchema).refine((ls) => ls.some((l) => l.incluida), {
    message: 'Deja al menos un producto en la cotización.',
  }),
  nota: z.string().trim().max(1000, 'La nota admite hasta 1.000 caracteres.'),
  /** Vacío = se pone al enviar con el plazo configurado. */
  fechaVencimiento: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, 'Usa una fecha válida.'),
});
export type EditorFormData = z.infer<typeof editorFormSchema>;
