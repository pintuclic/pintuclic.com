import { z } from 'zod';

/**
 * Formularios de la pantalla del carrito. El código de cupón admite cualquier texto corto (como
 * `codigoCuponEntradaSchema` de M06): uno mal escrito vuelve del cálculo como "no válido".
 */
export const cuponFormSchema = z.object({
  codigo: z
    .string()
    .trim()
    .min(1, 'Escribe el código de descuento.')
    .max(60, 'El código es demasiado largo.'),
});
export type CuponFormData = z.infer<typeof cuponFormSchema>;

/** Cantidad escrita a mano en una línea (C4): de 1 a 9 999. */
export const cantidadFormSchema = z.coerce
  .number({ message: 'Escribe una cantidad.' })
  .int('Escribe un número entero.')
  .min(1, 'La cantidad mínima es 1. Para quitarlo usa "Quitar".')
  .max(9_999, 'La cantidad máxima es 9.999.');
