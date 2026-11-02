import { z } from 'zod';
import { telefonoSchema } from '@/core/dtos/telefono.dto';
import { celularNequiSchema, medioPagoSchema, modoEntregaSchema } from './m07-checkout.dto';

/** Formularios de M07 (Directiva #12: ningún esquema Zod vive dentro de un `.tsx`). */

const texto = (min: number, max: number, mensaje: string) => z.string().trim().min(min, mensaje).max(max);

/** R12, R13: con Nequi, el celular y las dos casillas de Wompi; la página de Wompi los pide en su lado (R19). */
function validarNequi(
  v: { medio: string; celularNequi: string; aceptaReglamento: boolean; aceptaDatos: boolean },
  ctx: z.RefinementCtx,
): void {
  if (v.medio !== 'nequi') return;
  const celular = celularNequiSchema.safeParse(v.celularNequi);
  if (!celular.success) {
    ctx.addIssue({ code: 'custom', path: ['celularNequi'], message: celular.error.issues[0]?.message ?? 'Revisa el celular.' });
  }
  if (!v.aceptaReglamento) {
    ctx.addIssue({ code: 'custom', path: ['aceptaReglamento'], message: 'Debes aceptar el reglamento de Wompi para pagar.' });
  }
  if (!v.aceptaDatos) {
    ctx.addIssue({ code: 'custom', path: ['aceptaDatos'], message: 'Debes autorizar el tratamiento de tus datos para pagar.' });
  }
}

/** /checkout: entrega (R14), medio de pago (R19) y, con Nequi, el celular (R12) y las casillas de Wompi (R13). */
export const pagoFormSchema = z
  .object({
    modoEntrega: modoEntregaSchema,
    direccion: z.string().trim().max(255),
    barrio: z.string().trim().max(100),
    apartamentoCasa: z.string().trim().max(100),
    nombreRecibe: z.string().trim().max(150),
    telefonoRecibe: z.string().trim().max(20),
    medio: medioPagoSchema,
    celularNequi: z.string().trim().max(20),
    aceptaReglamento: z.boolean(),
    aceptaDatos: z.boolean(),
  })
  .superRefine((v, ctx) => {
    validarNequi(v, ctx);
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

/** Reintentar desde /checkout/:codigo (R4), con Nequi o en la página de Wompi (R19). */
export const reintentoFormSchema = z
  .object({
    medio: medioPagoSchema,
    celularNequi: z.string().trim().max(20),
    aceptaReglamento: z.boolean(),
    aceptaDatos: z.boolean(),
  })
  .superRefine(validarNequi);
export type ReintentoFormEntrada = z.input<typeof reintentoFormSchema>;
export type ReintentoFormData = z.output<typeof reintentoFormSchema>;
