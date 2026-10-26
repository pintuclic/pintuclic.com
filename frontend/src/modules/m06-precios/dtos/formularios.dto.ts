import { z } from 'zod';
import { audienciaSchema, tipoValorSchema } from './m06-precios.dto';

/**
 * Esquemas de los FORMULARIOS de M06. Los campos viajan como texto (es lo que entregan los inputs);
 * `services/formularios.ts` los convierte en el cuerpo del contrato, que se vuelve a validar con el
 * esquema espejo antes de enviarlo. Directiva #12: ningún esquema Zod vive inline en un `.tsx`.
 */
export const formCuponSchema = z.object({
  codigo: z
    .string()
    .trim()
    .min(1, 'Escriba el código')
    .regex(/^[A-Za-z0-9_-]{6,30}$/, 'Use de 6 a 30 letras, números, guion o guion bajo'),
  nombre: z.string().trim().min(3, 'Mínimo 3 caracteres').max(100, 'Máximo 100 caracteres'),
  descripcion: z.string().trim().max(500, 'Máximo 500 caracteres'),
  tipoValor: tipoValorSchema,
  valor: z.string().trim().min(1, 'Escriba el valor'),
  montoMinimoCompra: z.string().trim(),
  usosMaximos: z.string().trim(),
  usosPorUsuario: z.string().trim(),
  audiencia: audienciaSchema,
  fechaInicio: z.string().min(1, 'Elija la fecha de inicio'),
  fechaFin: z.string(),
});
export type FormCupon = z.infer<typeof formCuponSchema>;

export const formTipoClienteSchema = z.object({
  nombre: z.string().trim().min(3, 'Mínimo 3 caracteres').max(100, 'Máximo 100 caracteres'),
  porcentaje: z.string().trim().min(1, 'Escriba el porcentaje'),
  montoMinimoCompra: z.string().trim(),
  tope: z.string().trim(),
});
export type FormTipoCliente = z.infer<typeof formTipoClienteSchema>;
