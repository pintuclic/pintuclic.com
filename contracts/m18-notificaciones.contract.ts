import { z } from 'zod';

/**
 * ============================================================================
 * CONTRATO DE API REST — M18. Notificaciones y Comunicaciones
 * ============================================================================
 * Scope: m18-notificaciones · Ola 3
 *
 * Regla de Oro #1: Cero código de implementación sin contrato previo.
 * Regla de Oro #11: Tolerancia Cero al tipo `any`.
 *
 * Alcance de este contrato: HU-NOT-01 (envío transaccional, sin endpoint público —
 * se invoca vía NotificacionesPort desde otros módulos backend), HU-NOT-03
 * (plantillas administrables) y HU-NOT-04 (entregabilidad / registro de rebotes).
 * HU-NOT-02 (aviso de cambio de estado de orden) queda pendiente de M08: su
 * contrato de tipos vive en `backend/src/modules/m18-notificaciones/interfaces/
 * notificaciones.port.ts` (EventoCambioEstadoOrden), sin endpoint ni wiring aún.
 *
 * Fuente de verdad: docs/01_TRANSVERSALES/M18_NOTIFICACIONES.md
 * ============================================================================
 */

/* ───────────────────────────────────────────────────────────────────────────
 * 1. PRIMITIVAS COMPARTIDAS Y ENUMS OFICIALES
 * ─────────────────────────────────────────────────────────────────────────── */

export const correoSchema = z.string().email().max(150).toLowerCase();

/** Espejo de EventoNotificacion['tipo'] en notificaciones.port.ts */
export const TIPOS_COMUNICACION = [
  'registro_otp',
  'recuperacion_password',
  'activacion_empleado',
  'cambio_correo_otp',
  'cambio_correo_confirmado',
  'dictamen_empresa',
  /** M03 · I9: el servicio de IA acumuló los fallos consecutivos configurados. */
  'alerta_servicio_ia',
] as const;
export const tipoComunicacionSchema = z.enum(TIPOS_COMUNICACION);
export type TipoComunicacion = z.infer<typeof tipoComunicacionSchema>;

export const ESTADOS_ENVIO = ['pendiente', 'enviado', 'fallido'] as const;
export const estadoEnvioSchema = z.enum(ESTADOS_ENVIO);
export type EstadoEnvio = z.infer<typeof estadoEnvioSchema>;

const paginaSchema = z.coerce.number().int().positive().default(1);
const limiteSchema = z.coerce.number().int().min(1).max(100).default(20);

/* ───────────────────────────────────────────────────────────────────────────
 * 2. ENVELOPES CANÓNICOS Y CÓDIGOS SEMÁNTICOS DE ERROR
 * ─────────────────────────────────────────────────────────────────────────── */

export const CODIGOS_ERROR_M18 = {
  ACCESO_DENEGADO: 'ACCESO_DENEGADO',
  PLANTILLA_NO_ENCONTRADA: 'PLANTILLA_NO_ENCONTRADA',
  PARAMETRO_INVALIDO: 'PARAMETRO_INVALIDO',
  ERROR_INTERNO: 'ERROR_INTERNO',
} as const;

export const codigoErrorM18Schema = z.enum([
  CODIGOS_ERROR_M18.ACCESO_DENEGADO,
  CODIGOS_ERROR_M18.PLANTILLA_NO_ENCONTRADA,
  CODIGOS_ERROR_M18.PARAMETRO_INVALIDO,
  CODIGOS_ERROR_M18.ERROR_INTERNO,
]);

export const errorResponseEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().nullable(),
  }),
});
export type ErrorResponseEnvelope = z.infer<typeof errorResponseEnvelopeSchema>;

/** RN-SEG-08 / ADR-003: misma opacidad absoluta que el resto del panel administrativo. */
export const RESPUESTA_ACCESO_DENEGADO_OPACA: ErrorResponseEnvelope = {
  success: false,
  error: {
    code: CODIGOS_ERROR_M18.ACCESO_DENEGADO,
    message: 'El recurso solicitado no está disponible.',
    details: null,
  },
};

/* ───────────────────────────────────────────────────────────────────────────
 * 3. HU-NOT-03 — PLANTILLAS DE COMUNICACIÓN ADMINISTRABLES
 * ─────────────────────────────────────────────────────────────────────────── */

export const plantillaNotificacionSchema = z.object({
  tipo: tipoComunicacionSchema,
  asunto: z.string(),
  contenidoTexto: z.string(),
  fechaActualizacion: z.string().datetime(),
});
export type PlantillaNotificacion = z.infer<typeof plantillaNotificacionSchema>;

export const listarPlantillasOutputSchema = z.object({
  plantillas: z.array(plantillaNotificacionSchema),
});
export type ListarPlantillasOutput = z.infer<typeof listarPlantillasOutputSchema>;

/**
 * Decisión de producto: el admin nunca edita HTML ni variables `{{}}` — solo el
 * asunto y una copia introductoria en texto plano. El maquetado y los datos
 * dinámicos quedan fijos en el backend (adapters/plantillas-html.ts).
 */
export const actualizarPlantillaInputSchema = z.object({
  asunto: z.string().trim().min(1).max(200).optional(),
  contenidoTexto: z.string().trim().min(1).optional(),
});
export type ActualizarPlantillaInput = z.infer<typeof actualizarPlantillaInputSchema>;

/** Permite previsualizar cambios de asunto/texto sin guardarlos todavía. */
export const previsualizarPlantillaInputSchema = z.object({
  asunto: z.string().trim().min(1).max(200).optional(),
  contenidoTexto: z.string().trim().min(1).optional(),
});
export type PrevisualizarPlantillaInput = z.infer<typeof previsualizarPlantillaInputSchema>;

export const previsualizarPlantillaOutputSchema = z.object({
  asunto: z.string(),
  contenidoHtml: z.string(),
  contenidoTexto: z.string(),
});
export type PrevisualizarPlantillaOutput = z.infer<typeof previsualizarPlantillaOutputSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 4. RF-NOT-01-04 / HU-NOT-04 — REGISTRO DE ENVÍOS Y REBOTES (DIAGNÓSTICO)
 * ─────────────────────────────────────────────────────────────────────────── */

export const listarEnviosQuerySchema = z.object({
  tipo: tipoComunicacionSchema.optional(),
  estado: estadoEnvioSchema.optional(),
  pagina: paginaSchema,
  limite: limiteSchema,
});
export type ListarEnviosQuery = z.infer<typeof listarEnviosQuerySchema>;

export const envioNotificacionSchema = z.object({
  idEnvio: z.string().uuid(),
  tipo: tipoComunicacionSchema,
  destinatario: correoSchema,
  estado: estadoEnvioSchema,
  intentos: z.number().int().nonnegative(),
  maxIntentos: z.number().int().positive(),
  ultimoError: z.string().nullable(),
  fechaCreacion: z.string().datetime(),
  fechaResultado: z.string().datetime().nullable(),
});
export type EnvioNotificacion = z.infer<typeof envioNotificacionSchema>;

export const listarEnviosOutputSchema = z.object({
  envios: z.array(envioNotificacionSchema),
  total: z.number().int().nonnegative(),
  pagina: z.number().int().positive(),
  limite: z.number().int().positive(),
});
export type ListarEnviosOutput = z.infer<typeof listarEnviosOutputSchema>;

export const listarRebotesQuerySchema = z.object({
  pagina: paginaSchema,
  limite: limiteSchema,
});
export type ListarRebotesQuery = z.infer<typeof listarRebotesQuerySchema>;

export const reboteNotificacionSchema = z.object({
  idRebote: z.string().uuid(),
  idEnvio: z.string().uuid().nullable(),
  destinatario: correoSchema,
  motivo: z.string().nullable(),
  fechaRegistro: z.string().datetime(),
});
export type ReboteNotificacion = z.infer<typeof reboteNotificacionSchema>;

export const listarRebotesOutputSchema = z.object({
  rebotes: z.array(reboteNotificacionSchema),
  total: z.number().int().nonnegative(),
  pagina: z.number().int().positive(),
  limite: z.number().int().positive(),
});
export type ListarRebotesOutput = z.infer<typeof listarRebotesOutputSchema>;
