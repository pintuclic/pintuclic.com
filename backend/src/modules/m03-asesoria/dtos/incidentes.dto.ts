import { z } from 'zod';
import { idSchema, respuestaPaginada, respuestaUno } from '../../m01-catalogo/dtos/m01-catalogo.dto';

/**
 * DTOs de la resiliencia del servicio de IA (HU-ASE-06).
 * Espejo de `contracts/m03-asesoria.contract.ts`.
 */

export const servicioIaSchema = z.enum(['gemini']);
export type ServicioIa = z.infer<typeof servicioIaSchema>;

export const funcionIaSchema = z.enum(['chat', 'cuestionario']);
export type FuncionIa = z.infer<typeof funcionIaSchema>;

export const tipoIncidenteIaSchema = z.enum([
  'tiempo_agotado',
  'no_disponible',
  'cuota_agotada',
  'respuesta_no_procesable',
  'error_configuracion',
]);
export type TipoIncidenteIa = z.infer<typeof tipoIncidenteIaSchema>;

export const resultadoIncidenteIaSchema = z.enum(['recuperado', 'fallido', 'suspendido']);
export type ResultadoIncidenteIa = z.infer<typeof resultadoIncidenteIaSchema>;

/**
 * I7 — lo que se guarda de un fallo. NUNCA el texto de la persona, la respuesta del modelo,
 * la dirección IP ni la clave del servicio.
 */
export const incidenteIaSchema = z.object({
  idIncidente: idSchema,
  fecha: z.string(),
  servicio: servicioIaSchema,
  funcion: funcionIaSchema,
  tipo: tipoIncidenteIaSchema,
  intentos: z.number().int(),
  resultado: resultadoIncidenteIaSchema,
});
export type IncidenteIa = z.infer<typeof incidenteIaSchema>;

export const listarIncidentesQuerySchema = z.object({
  tipo: tipoIncidenteIaSchema.optional(),
  desde: z.string().optional(),
  hasta: z.string().optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListarIncidentesQuery = z.infer<typeof listarIncidentesQuerySchema>;

export const estadoServicioIaSchema = z.object({
  /** False cuando falta `GEMINI_API_KEY`: el asistente no se ofrece. */
  configurado: z.boolean(),
  /** I3: hasta cuándo están suspendidas las llamadas por cuota agotada. */
  suspendidoHasta: z.string().nullable(),
  fallosConsecutivos: z.number().int().nonnegative(),
  /** I9: se enciende al llegar al umbral y la apaga un éxito. */
  alertaActiva: z.boolean(),
  ultimoIncidente: incidenteIaSchema.nullable(),
});
export type EstadoServicioIa = z.infer<typeof estadoServicioIaSchema>;

/** GET /asesoria/asistente/estado — lo mínimo que el público necesita saber. */
export const estadoAsistenteSchema = z.object({
  disponible: z.boolean(),
  motivo: z.enum(['no_configurado', 'suspendido']).nullable(),
});
export type EstadoAsistente = z.infer<typeof estadoAsistenteSchema>;

export const incidentesResponseEnvelopeSchema = respuestaPaginada(incidenteIaSchema);
export type IncidentesResponseEnvelope = z.infer<typeof incidentesResponseEnvelopeSchema>;

export const estadoServicioIaResponseEnvelopeSchema = respuestaUno(estadoServicioIaSchema);
export type EstadoServicioIaResponseEnvelope = z.infer<typeof estadoServicioIaResponseEnvelopeSchema>;

export const estadoAsistenteResponseEnvelopeSchema = respuestaUno(estadoAsistenteSchema);
export type EstadoAsistenteResponseEnvelope = z.infer<typeof estadoAsistenteResponseEnvelopeSchema>;
