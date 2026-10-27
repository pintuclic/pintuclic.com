import { z } from 'zod';
import { respuestaUno } from '../../m01-catalogo/dtos/m01-catalogo.dto';
import { productoPublicoTarjetaSchema } from '../../m01-catalogo/dtos/m01-catalogo-productos.dto';
import { CHAT_MAX_PRODUCTOS_CONTEXTO, CHAT_MAX_TURNOS_HISTORIAL } from '../services/asistente.service';

/** DTOs del asistente (HU-ASE-05). Espejo de `contracts/m03-asesoria.contract.ts`. */

export const turnoChatSchema = z.object({
  rol: z.enum(['usuario', 'asistente']),
  texto: z.string().trim().min(1).max(1500),
});
export type TurnoChat = z.infer<typeof turnoChatSchema>;

/** POST /asesoria/asistente/mensajes */
export const mensajeAsistenteRequestSchema = z.object({
  mensaje: z
    .string({ error: 'Escribe tu pregunta' })
    .trim()
    .min(1, 'Escribe tu pregunta')
    .max(500, 'Usa como máximo 500 caracteres'),
  /** H1: el servidor no guarda la conversación; el historial viaja con cada mensaje. */
  historial: z.array(turnoChatSchema).max(CHAT_MAX_TURNOS_HISTORIAL).default([]),
});
export type MensajeAsistenteRequest = z.infer<typeof mensajeAsistenteRequestSchema>;

export const respuestaAsistenteSchema = z.object({
  respuesta: z.string(),
  productos: z.array(productoPublicoTarjetaSchema).max(CHAT_MAX_PRODUCTOS_CONTEXTO),
  /** H7: destaca el botón hacia el formulario de contacto de M15. */
  ofrecerAsesor: z.boolean(),
});
export type RespuestaAsistente = z.infer<typeof respuestaAsistenteSchema>;

export const respuestaAsistenteResponseEnvelopeSchema = respuestaUno(respuestaAsistenteSchema);
export type RespuestaAsistenteResponseEnvelope = z.infer<typeof respuestaAsistenteResponseEnvelopeSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * Cuestionario asistido (R4, R6)
 * ─────────────────────────────────────────────────────────────────────────── */

export const filtroTurnoSchema = z.object({
  dimension: z.enum(['categoria', 'subcategoria', 'superficie', 'familia_color', 'tipo_resina', 'linea']),
  idValor: z.number().int().positive(),
});

export const complementoTurnoSchema = z.object({
  dimension: z.enum(['categoria', 'subcategoria']),
  idValor: z.number().int().positive(),
});

/**
 * Una respuesta ya dada en el modo asistido. Los filtros viajan con ella porque el flujo es
 * sin estado, y se vuelven a validar contra el vocabulario en cada turno: una opción
 * manipulada no mete un filtro inventado (D4).
 */
export const respuestaDadaSchema = z.object({
  idPregunta: z.string().min(1).max(40),
  texto: z.string().min(1).max(200),
  idOpcion: z.string().min(1).max(40).nullable(),
  opcionTexto: z.string().min(1).max(100).nullable(),
  filtros: z.array(filtroTurnoSchema).max(10).default([]),
  ambiente: z.enum(['interior', 'exterior']).nullable().default(null),
  complementos: z.array(complementoTurnoSchema).max(3).default([]),
  omitida: z.boolean().default(false),
});
export type RespuestaDada = z.infer<typeof respuestaDadaSchema>;

export const MAX_PREGUNTAS_CUESTIONARIO = 8;

/** POST /asesoria/cuestionario/turno */
export const turnoCuestionarioRequestSchema = z
  .object({
    respuestas: z.array(respuestaDadaSchema).max(MAX_PREGUNTAS_CUESTIONARIO).default([]),
    finalizar: z.boolean().default(false),
  })
  .refine((v) => new Set(v.respuestas.map((r) => r.idPregunta)).size === v.respuestas.length, {
    message: 'Cada pregunta se responde una sola vez',
    path: ['respuestas'],
  });
export type TurnoCuestionarioRequest = z.infer<typeof turnoCuestionarioRequestSchema>;

export const opcionAsistidaSchema = z.object({
  idOpcion: z.string(),
  texto: z.string(),
  filtros: z.array(filtroTurnoSchema),
  ambiente: z.enum(['interior', 'exterior']).nullable(),
  complementos: z.array(complementoTurnoSchema),
});
export type OpcionAsistida = z.infer<typeof opcionAsistidaSchema>;

export const preguntaAsistidaSchema = z.object({
  idPregunta: z.string(),
  texto: z.string(),
  opciones: z.array(opcionAsistidaSchema),
  /** R3: toda pregunta se puede omitir. */
  omitible: z.literal(true),
});
export type PreguntaAsistida = z.infer<typeof preguntaAsistidaSchema>;
