import { z } from 'zod';
import { telefonoSchema } from '@/core/dtos/telefono.dto';
import { celularNequiSchema, modoEntregaSchema } from './m07-checkout.dto';

/** Formularios de M07 (Directiva #12: ningún esquema Zod vive dentro de un `.tsx`). */

const texto = (min: number, max: number, mensaje: string) => z.string().trim().min(min, mensaje).max(max);

/** /checkout: entrega (R14), celular de Nequi (R12) y las dos casillas de Wompi (R13). */
export const pagoFormSchema = z
  .object({
    modoEntrega: modoEntregaSchema,
    direccion: z.string().trim().max(255),
    barrio: z.string().trim().max(100),
    apartamentoCasa: z.string().trim().max(100),
    nombreRecibe: z.string().trim().max(150),
    telefonoRecibe: z.string().trim().max(20),
    celularNequi: celularNequiSchema,
    aceptaReglamento: z.boolean().refine((v) => v, 'Debes aceptar el reglamento de Wompi para pagar.'),
    aceptaDatos: z.boolean().refine((v) => v, 'Debes autorizar el tratamiento de tus datos para pagar.'),
  })
  .superRefine((v, ctx) => {
    if (v.modoEntrega !== 'domicilio') return;
    const reglas: Array<[keyof typeof v, z.ZodType]> = [
      ['direccion', texto(5, 255, 'Escribe la dirección (al menos 5 caracteres).')],
      ['barrio', texto(2, 100, 'Escribe el barrio.')],
      ['nombreRecibe', texto(2, 150, 'Escribe quién recibe el pedido.')],
      ['telefonoRecibe', telefonoSchema],
    ];
    for (const [campo, esquema] of reglas) {
      const r = esquema.safeParse(v[campo]);
      if (!r.success) ctx.addIssue({ code: 'custom', path: [campo], message: r.error.issues[0]?.message ?? 'Revisa este dato.' });
    }
  });
export type PagoFormEntrada = z.input<typeof pagoFormSchema>;
export type PagoFormData = z.output<typeof pagoFormSchema>;

/** Reintentar desde /checkout/:codigo (R4). */
export const reintentoFormSchema = z.object({
  celularNequi: celularNequiSchema,
  aceptaReglamento: z.boolean().refine((v) => v, 'Debes aceptar el reglamento de Wompi para pagar.'),
  aceptaDatos: z.boolean().refine((v) => v, 'Debes autorizar el tratamiento de tus datos para pagar.'),
});
export type ReintentoFormEntrada = z.input<typeof reintentoFormSchema>;
export type ReintentoFormData = z.output<typeof reintentoFormSchema>;
