import { z } from 'zod';

/**
 * ============================================================================
 * DTOs Y ESQUEMAS DE VALIDACIÓN — M18. Notificaciones y Comunicaciones
 * ============================================================================
 * Espejo fiel de `contracts/m18-notificaciones.contract.ts` para ejecución
 * backend bajo Zod 4. Cero tipos `any`.
 */

/* ───────────────────────────────────────────────────────────────────────────
 * 1. PRIMITIVAS COMPARTIDAS Y ENUMS OFICIALES
 * ─────────────────────────────────────────────────────────────────────────── */

export const correoSchema = z.string().email().max(150).toLowerCase();

export const TIPOS_COMUNICACION = [
  'registro_otp',
  'recuperacion_password',
  'activacion_empleado',
  'cambio_correo_otp',
  'cambio_correo_confirmado',
  'dictamen_empresa',
  'alerta_servicio_ia',
  'comprobante_venta',
  'orden_despachada',
  'orden_cancelada',
  'cotizacion_respondida',
  'cotizacion_rechazada',
  'solicitud_empresa_recibida',
  'renovacion_nit_recibida',
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

/** Solo asunto y copia introductoria en texto plano: el admin no edita HTML ni variables. */
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

/* ───────────────────────────────────────────────────────────────────────────
 * 5. HU-NOT-04 / RF-NOT-04-04 — WEBHOOK DE REBOTES DEL PROVEEDOR (BREVO)
 * ─────────────────────────────────────────────────────────────────────────── */

/**
 * POST /notificaciones/webhook/rebotes — sin sesión; exige `Authorization: Bearer <BREVO_WEBHOOK_TOKEN>`.
 * Acepta un evento o un lote. Solo estos eventos se guardan como rebote; los demás (entregado, abierto, clic…) se
 * ignoran con 200 para que el proveedor no los reintente.
 */
export const EVENTOS_REBOTE = ['hard_bounce', 'soft_bounce', 'blocked', 'invalid_email'] as const;

export const eventoProveedorSchema = z.object({
  event: z.string().min(1).max(50),
  email: z.string().min(3).max(150),
  reason: z.string().max(1000).optional(),
});
export type EventoProveedor = z.infer<typeof eventoProveedorSchema>;

export const webhookRebotesInputSchema = z.union([eventoProveedorSchema, z.array(eventoProveedorSchema).min(1).max(500)]);

export const webhookRebotesOutputSchema = z.object({ registrados: z.number().int().nonnegative(), ignorados: z.number().int().nonnegative() });
export type WebhookRebotesOutput = z.infer<typeof webhookRebotesOutputSchema>;
