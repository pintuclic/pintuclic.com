import { z } from 'zod';

/**
 * ============================================================================
 * CONTRATO DE API REST — M20. Seguridad, Auditoría y Protección de Datos
 * ============================================================================
 * Scope: m20-seguridad · Ola 1
 *
 * Regla de Oro #1: cero código sin contrato previo.
 * Regla de Oro #11: Tolerancia Cero al tipo `any`.
 *
 * Alcance: 5 de 6 historias. HU-SEG-04 (auditoría) está APLAZADA por el
 * Product Owner; de ella solo se contrata el PUERTO (sección 6), no su API.
 *
 * Fuente funcional: docs/01_TRANSVERSALES/M20_SEGURIDAD_Y_AUDITORIA.md
 * ============================================================================
 */

/* ───────────────────────────────────────────────────────────────────────────
 * 1. PRIMITIVAS COMPARTIDAS
 * Las consumen M04, M17 y cualquier módulo que capture credenciales.
 * ─────────────────────────────────────────────────────────────────────────── */

/** RN-SEG-01. El mínimo de 12 caracteres es decisión de arquitectura, no de la spec. */
export const contrasenaSchema = z
  .string()
  .min(12, 'La contraseña debe tener al menos 12 caracteres')
  .max(128, 'La contraseña no puede superar los 128 caracteres');

export const correoSchema = z.string().email().max(150).toLowerCase();

export const identificadorUsuarioSchema = z.number().int().positive();
export const identificadorSesionSchema = z.string().uuid();

/* ───────────────────────────────────────────────────────────────────────────
 * 2. ENVELOPE CANÓNICO Y CÓDIGOS SEMÁNTICOS
 * ─────────────────────────────────────────────────────────────────────────── */

export const CODIGOS_ERROR = {
  RECURSO_NO_DISPONIBLE: 'RECURSO_NO_DISPONIBLE',
  SESION_EXPIRADA: 'SESION_EXPIRADA',
  CREDENCIALES_INVALIDAS: 'CREDENCIALES_INVALIDAS',
  CONSENTIMIENTO_REQUERIDO: 'CONSENTIMIENTO_REQUERIDO',
  SOLICITUD_DUPLICADA: 'SOLICITUD_DUPLICADA',
  ERROR_INTERNO: 'ERROR_INTERNO',
} as const;

export const codigoErrorSchema = z.enum([
  CODIGOS_ERROR.RECURSO_NO_DISPONIBLE,
  CODIGOS_ERROR.SESION_EXPIRADA,
  CODIGOS_ERROR.CREDENCIALES_INVALIDAS,
  CODIGOS_ERROR.CONSENTIMIENTO_REQUERIDO,
  CODIGOS_ERROR.SOLICITUD_DUPLICADA,
  CODIGOS_ERROR.ERROR_INTERNO,
]);

/** RN-SEG-09: el error jamás transporta rutas, consultas ni versiones. */
export const errorResponseEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: codigoErrorSchema,
    message: z.string(),
    details: z.null(),
  }),
});
export type ErrorResponseEnvelope = z.infer<typeof errorResponseEnvelopeSchema>;

/**
 * ⚠️ RN-SEG-08 — INDISTINGUIBILIDAD (CA-SEG-03-06).
 *
 * Reserva que el Arquitecto asumió en la mesa ATDD: un recurso inexistente y un
 * recurso existente pero ajeno NO pueden responder por ramas distintas que
 * "casualmente" coincidan. Ambas devuelven ESTE MISMO objeto, byte a byte, con
 * HTTP 404. Es la única respuesta admisible para ambos casos.
 */
export const RESPUESTA_RECURSO_NO_DISPONIBLE: ErrorResponseEnvelope = {
  success: false,
  error: {
    code: CODIGOS_ERROR.RECURSO_NO_DISPONIBLE,
    message: 'El recurso solicitado no está disponible.',
    details: null,
  },
};

/* ───────────────────────────────────────────────────────────────────────────
 * 3. HU-SEG-02 — SESIÓN
 * Mapea 1:1 los enums de bd/sql/schema_pintuclic.sql (tabla `sesion`).
 * ─────────────────────────────────────────────────────────────────────────── */

export const tipoSesionSchema = z.enum(['admin', 'cliente']);
export type TipoSesion = z.infer<typeof tipoSesionSchema>;

export const estadoSesionSchema = z.enum(['activa', 'cerrada', 'expirada', 'revocada']);
export type EstadoSesion = z.infer<typeof estadoSesionSchema>;

export const motivoCierreSesionSchema = z.enum([
  'cierre_manual',
  'inactividad',
  'cambio_contrasena',
  'cuenta_desactivada',
  'permisos_retirados',
]);
export type MotivoCierreSesion = z.infer<typeof motivoCierreSesionSchema>;

/**
 * Reserva #2 de la mesa ATDD: `estado` y `motivoCierre` son campos PERSISTIDOS,
 * no derivados en tiempo de lectura. Sin ellos, el Escenario 4 de HU-SEG-02
 * (cuenta desactivada) no es comprobable.
 */
export const sesionEntitySchema = z.object({
  idSesion: identificadorSesionSchema,
  tipoSesion: tipoSesionSchema,
  estado: estadoSesionSchema,
  motivoCierre: motivoCierreSesionSchema.nullable(),
  fechaInicio: z.string().datetime(),
  fechaUltimoAcceso: z.string().datetime(),
  fechaExpiracion: z.string().datetime(),
});
export type SesionEntity = z.infer<typeof sesionEntitySchema>;

/** RF-SEG-02-04. El cuerpo va vacío: la sesión se identifica por la cookie. */
export const cerrarSesionRequestSchema = z.object({}).strict();
export type CerrarSesionRequest = z.infer<typeof cerrarSesionRequestSchema>;

export const cerrarSesionResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.object({
    idSesion: identificadorSesionSchema,
    estado: z.literal('cerrada'),
    motivoCierre: z.literal('cierre_manual'),
  }),
  message: z.string(),
});
export type CerrarSesionResponseEnvelope = z.infer<typeof cerrarSesionResponseEnvelopeSchema>;

/**
 * Reserva #4 de la mesa ATDD: los atributos de la cookie se fijan aquí para que
 * el Escenario 8 de HU-SEG-02 (RNF-SEG-02-01) sea una aserción automatizable y
 * no una inspección manual. `httpOnly` es lo que impide que el código de la
 * página lea el identificador de sesión.
 */
export const atributosCookieSesionSchema = z.object({
  nombre: z.literal('pc_sid'),
  httpOnly: z.literal(true),
  secure: z.literal(true),
  sameSite: z.literal('strict'),
  path: z.literal('/'),
});
export type AtributosCookieSesion = z.infer<typeof atributosCookieSesionSchema>;

export const ATRIBUTOS_COOKIE_SESION: AtributosCookieSesion = {
  nombre: 'pc_sid',
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  path: '/',
};

/** RF-SEG-02-02. Ventana de inactividad por tipo de sesión, en segundos. */
export const VENTANA_INACTIVIDAD_SEGUNDOS: Readonly<Record<TipoSesion, number>> = {
  admin: 1800,
  cliente: 2592000,
};

/* ───────────────────────────────────────────────────────────────────────────
 * 4. HU-SEG-05 — PROTECCIÓN DE DATOS PERSONALES
 * ─────────────────────────────────────────────────────────────────────────── */

export const avisoPrivacidadEntitySchema = z.object({
  idAvisoPrivacidad: z.number().int().positive(),
  version: z.string().min(1).max(50),
  descripcion: z.string(),
  esVigente: z.boolean(),
});
export type AvisoPrivacidadEntity = z.infer<typeof avisoPrivacidadEntitySchema>;

/** RF-SEG-05-03. Público: accesible sin autenticarse. */
export const avisoVigenteResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: avisoPrivacidadEntitySchema,
});
export type AvisoVigenteResponseEnvelope = z.infer<typeof avisoVigenteResponseEnvelopeSchema>;

/**
 * RF-SEG-05-01/02. El titular declara QUÉ VERSIÓN acepta; el servidor rechaza
 * si no es la vigente, para que no pueda consentirse una versión obsoleta.
 */
export const otorgarConsentimientoRequestSchema = z.object({
  idAvisoPrivacidad: z.number().int().positive(),
  aceptado: z.literal(true),
});
export type OtorgarConsentimientoRequest = z.infer<typeof otorgarConsentimientoRequestSchema>;

export const consentimientoEntitySchema = z.object({
  idConsentimiento: z.number().int().positive(),
  idAvisoPrivacidad: z.number().int().positive(),
  versionAviso: z.string(),
  fecha: z.string().datetime(),
});
export type ConsentimientoEntity = z.infer<typeof consentimientoEntitySchema>;

export const consentimientoResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: consentimientoEntitySchema,
  message: z.string(),
});
export type ConsentimientoResponseEnvelope = z.infer<typeof consentimientoResponseEnvelopeSchema>;

export const estadoSolicitudSupresionSchema = z.enum([
  'pendiente',
  'en_proceso',
  'aprobada',
  'rechazada',
]);
export type EstadoSolicitudSupresion = z.infer<typeof estadoSolicitudSupresionSchema>;

/** RF-SEG-05-06. El motivo es opcional: el titular no está obligado a justificarse. */
export const crearSolicitudSupresionRequestSchema = z.object({
  motivo: z.string().max(500).optional(),
});
export type CrearSolicitudSupresionRequest = z.infer<typeof crearSolicitudSupresionRequestSchema>;

export const solicitudSupresionEntitySchema = z.object({
  idSolicitudSupresion: z.number().int().positive(),
  estado: estadoSolicitudSupresionSchema,
  fechaSolicitud: z.string().datetime(),
  fechaResolucion: z.string().datetime().nullable(),
});
export type SolicitudSupresionEntity = z.infer<typeof solicitudSupresionEntitySchema>;

export const solicitudSupresionResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: solicitudSupresionEntitySchema,
  message: z.string(),
});
export type SolicitudSupresionResponseEnvelope = z.infer<
  typeof solicitudSupresionResponseEnvelopeSchema
>;

export const listaSolicitudesSupresionResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.array(solicitudSupresionEntitySchema),
});
export type ListaSolicitudesSupresionResponseEnvelope = z.infer<
  typeof listaSolicitudesSupresionResponseEnvelopeSchema
>;

/* ───────────────────────────────────────────────────────────────────────────
 * 5. HU-SEG-03 — AUTORIZACIÓN (puerto interno, sin HTTP propio)
 * ─────────────────────────────────────────────────────────────────────────── */

export const actorSchema = z.object({
  idUsuario: identificadorUsuarioSchema,
  idSesion: identificadorSesionSchema,
  tipoSesion: tipoSesionSchema,
});
export type Actor = z.infer<typeof actorSchema>;

/** Permiso atómico. Nunca un rol: PINTUCLIC_CONTEXT.md §5 lo prohíbe. */
export const codigoPermisoSchema = z
  .string()
  .regex(/^[a-z]+(\.[a-z_]+)+$/, 'Formato esperado: area.recurso.accion');
export type CodigoPermiso = z.infer<typeof codigoPermisoSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 6. RN-SEG-15 — PUERTO DE AUDITORÍA (HU-SEG-04 aplazada)
 *
 * Se contrata el EVENTO, no la API de consulta. Esto permite cablear hoy los
 * puntos de llamada y sustituir solo el adaptador cuando el Product Owner
 * desbloquee HU-SEG-04, sin tocar un solo llamador.
 * ─────────────────────────────────────────────────────────────────────────── */

export const eventoAccesoDenegadoSchema = z.object({
  idUsuario: identificadorUsuarioSchema.nullable(),
  operacionIntentada: z.string().min(1).max(200),
  permisoRequerido: codigoPermisoSchema.nullable(),
  fecha: z.string().datetime(),
  ipOrigen: z.string().max(45).nullable(),
});
export type EventoAccesoDenegado = z.infer<typeof eventoAccesoDenegadoSchema>;

/**
 * Contrato del puerto. El adaptador vigente en esta entrega escribe en el
 * registro técnico interno; el adaptador persistente llegará con HU-SEG-04.
 */
export interface AuditoriaPort {
  registrarAccesoDenegado(evento: EventoAccesoDenegado): Promise<void>;
}
