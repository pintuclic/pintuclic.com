import { z } from 'zod';
import { ESTADOS_ORDEN, MEDIOS_CONTACTO, estadoOrdenSchema, type EstadoOrden } from './m08-ordenes.dto';

/**
 * Esquemas de los FORMULARIOS del panel de M08. Los campos viajan como texto (es lo que entregan
 * los inputs); `services/formularios.ts` los convierte en los cuerpos del contrato.
 * Ningún esquema Zod vive inline en un `.tsx`.
 */

/** Búsqueda de pedidos (HU-ORD-08): por identificador, correo, teléfono, estado y periodo. */
export const filtrosBandejaFormSchema = z
  .object({
    codigo: z.string().trim().max(20, 'Máximo 20 caracteres'),
    correo: z.string().trim().max(150, 'Máximo 150 caracteres'),
    telefono: z.string().trim().max(20, 'Máximo 20 caracteres'),
    estado: z.enum(['', ...ESTADOS_ORDEN]),
    desde: z.string(),
    hasta: z.string(),
  })
  .refine((v) => v.desde === '' || v.hasta === '' || v.desde <= v.hasta, {
    message: 'La fecha inicial no puede ser posterior a la final',
    path: ['desde'],
  });
export type FiltrosBandejaForm = z.infer<typeof filtrosBandejaFormSchema>;

export const FILTROS_BANDEJA_VACIOS: FiltrosBandejaForm = {
  codigo: '',
  correo: '',
  telefono: '',
  estado: '',
  desde: '',
  hasta: '',
};

/** Cambio de estado (HU-ORD-03). Volver de preparada a en preparación exige motivo (RF-CUM-05-05). */
export function crearEsquemaCambioEstado(estadoActual: EstadoOrden) {
  return z
    .object({
      estadoNuevo: estadoOrdenSchema,
      motivo: z.string().trim().max(500, 'Máximo 500 caracteres'),
    })
    .superRefine((v, ctx) => {
      if (estadoActual === 'preparada' && v.estadoNuevo === 'en_preparacion' && v.motivo === '') {
        ctx.addIssue({ code: 'custom', message: 'Indique el motivo de volver a preparación', path: ['motivo'] });
      }
    });
}
export type CambioEstadoForm = z.infer<ReturnType<typeof crearEsquemaCambioEstado>>;

/** Nota interna (HU-ORD-10). */
export const notaFormSchema = z.object({
  texto: z.string().trim().min(1, 'Escriba la nota').max(2000, 'Máximo 2000 caracteres'),
});
export type NotaForm = z.infer<typeof notaFormSchema>;

/** Contacto con el cliente (HU-ORD-09-02): solo deja constancia, no envía el mensaje. */
export const contactoFormSchema = z.object({
  medio: z.enum(MEDIOS_CONTACTO),
  detalle: z.string().trim().max(500, 'Máximo 500 caracteres'),
});
export type ContactoForm = z.infer<typeof contactoFormSchema>;
