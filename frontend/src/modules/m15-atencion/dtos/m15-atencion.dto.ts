import { z } from 'zod';

/**
 * Esquemas de formulario de M15, espejo de `contracts/m15-atencion.contract.ts`.
 * Viven aquí y nunca en los `.tsx` (AGENTS.md); se usan con React Hook Form +
 * zodResolver. Los mensajes dicen qué falta, no un error genérico.
 */

export const TIPOS_SOLICITUD = [
  { valor: 'consulta', etiqueta: 'Consulta' },
  { valor: 'cotizacion', etiqueta: 'Cotización' },
  { valor: 'reclamo', etiqueta: 'Reclamo' },
] as const;

export const DIAS_SEMANA = [
  { valor: 'lunes', etiqueta: 'Lunes' },
  { valor: 'martes', etiqueta: 'Martes' },
  { valor: 'miercoles', etiqueta: 'Miércoles' },
  { valor: 'jueves', etiqueta: 'Jueves' },
  { valor: 'viernes', etiqueta: 'Viernes' },
  { valor: 'sabado', etiqueta: 'Sábado' },
  { valor: 'domingo', etiqueta: 'Domingo' },
] as const;

const horaSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Usa el formato de 24 horas, por ejemplo 08:00');

/** Formulario de contacto público (HU-ATC-02). */
export const contactoFormSchema = z.object({
  tipo: z.enum(['consulta', 'cotizacion', 'reclamo'], {
    message: 'Indica si es una consulta, una cotización o un reclamo',
  }),
  descripcion: z
    .string()
    .trim()
    .min(5, 'Cuéntanos tu solicitud con al menos 5 caracteres')
    .max(2000, 'La solicitud no puede superar los 2000 caracteres'),
});
export type ContactoFormData = z.infer<typeof contactoFormSchema>;

/** Canal de contacto directo (HU-ATC-03). */
export const canalFormSchema = z.object({
  destino: z
    .string()
    .trim()
    .min(5, 'Escribe el enlace del canal o el número de WhatsApp')
    .max(300, 'El destino no puede superar los 300 caracteres'),
  mensajeBase: z
    .string()
    .trim()
    .max(300, 'El mensaje no puede superar los 300 caracteres')
    .optional(),
});
export type CanalFormData = z.infer<typeof canalFormSchema>;

/** Una franja del horario semanal (HU-ATC-04). */
export const franjaFormSchema = z
  .object({
    diaSemana: z.enum(['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']),
    abierto: z.boolean(),
    horaInicio: z.string(),
    horaFin: z.string(),
  })
  .superRefine((franja, ctx) => {
    if (!franja.abierto) {
      return;
    }

    const inicio = horaSchema.safeParse(franja.horaInicio);
    if (!inicio.success) {
      ctx.addIssue({
        code: 'custom',
        path: ['horaInicio'],
        message: inicio.error.issues[0]?.message ?? 'Escribe la hora de apertura',
      });
    }

    const fin = horaSchema.safeParse(franja.horaFin);
    if (!fin.success) {
      ctx.addIssue({
        code: 'custom',
        path: ['horaFin'],
        message: fin.error.issues[0]?.message ?? 'Escribe la hora de cierre',
      });
      return;
    }

    if (inicio.success && franja.horaFin <= franja.horaInicio) {
      ctx.addIssue({
        code: 'custom',
        path: ['horaFin'],
        message: 'La hora de cierre debe ser posterior a la de apertura',
      });
    }
  });

export const horarioFormSchema = z.object({
  franjas: z.array(franjaFormSchema).length(7),
});
export type HorarioFormData = z.infer<typeof horarioFormSchema>;
