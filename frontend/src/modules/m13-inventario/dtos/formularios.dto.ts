import { z } from 'zod';
import { EXISTENCIA_MAXIMA, motivoManualSchema } from './m13-inventario.dto';

/**
 * Esquema del FORMULARIO de ajuste de M13. Los campos viajan como texto (es lo que entregan los
 * inputs); `services/formularios.ts` los convierte en el cuerpo del contrato, que se vuelve a
 * validar con el esquema espejo antes de enviarlo.
 * Directiva #12: ningún esquema Zod vive inline en un `.tsx`.
 */
export const formAjusteSchema = z.object({
  existencia: z
    .string()
    .trim()
    .min(1, 'Escriba la existencia')
    .regex(/^\d+$/, 'Use un número entero, sin decimales ni signos')
    .refine((v) => Number(v) <= EXISTENCIA_MAXIMA, 'La existencia es demasiado grande'),
  motivo: motivoManualSchema,
  nota: z.string().trim().max(500, 'Máximo 500 caracteres'),
});
export type FormAjuste = z.infer<typeof formAjusteSchema>;
