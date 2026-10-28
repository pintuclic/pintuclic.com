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
 * Alcance: 5 de 6 historias completas. De HU-SEG-04 (auditoría) se entrega la parte de
 * ESCRITURA desde el esquema 4.18, pedida por M03: la tabla `registro_auditoria` inmutable
 * y `registrarAccion` en el puerto (sección 6). Siguen PENDIENTES la consulta del registro
 * por el administrador (RF-SEG-04-05) y la lista definitiva de acciones que se persisten
 * (RF-SEG-04-01), que decide el Product Owner.
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
 * HU-SEG-04 — ACCIÓN AUDITADA (parte de ESCRITURA, desbloqueada con M03).
 *
 * `registro_auditoria` existe desde el esquema 4.18 y es INMUTABLE: el DDL revoca UPDATE,
 * DELETE y TRUNCATE, de modo que ni el administrador pueda alterar un registro
 * (RF-SEG-04-04). La prohibición vive en la base de datos, no solo en el código.
 *
 * Lo que sigue PENDIENTE de M20: la consulta del registro por el administrador
 * (RF-SEG-04-05) y la lista definitiva de acciones que se persisten (RF-SEG-04-01). Los
 * accesos denegados siguen yendo al registro técnico hasta que el Product Owner los incluya.
 *
 * El emisor recorta los valores antes de emitir: un texto largo se registra por su longitud
 * y una huella, nunca completo. El evento jamás transporta contraseñas, hashes, datos de
 * pago ni la clave de un servicio externo (RF-SEG-04-07).
 */
export const eventoAccionAuditadaSchema = z.object({
  /** Null cuando la acción la hizo el sistema y no una persona. */
  idUsuario: identificadorUsuarioSchema.nullable(),
  /** Copia del nombre del actor: el registro sigue siendo legible si la cuenta se elimina. */
  actor: z.string().max(150).nullable(),
  /** Acción en punto, como el código de un permiso: `asesoria.configuracion.editar`. */
  accion: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z]+(\.[a-z_]+)+$/, 'Formato esperado: area.recurso.accion'),
  entidad: z.string().min(1).max(60),
  idEntidad: z.string().max(60).nullable(),
  valorAnterior: z.string().max(2000).nullable(),
  valorNuevo: z.string().max(2000).nullable(),
  resultado: z.enum(['exito', 'fallo']),
  fecha: z.string().datetime(),
  ipOrigen: z.string().max(45).nullable(),
});
export type EventoAccionAuditada = z.infer<typeof eventoAccionAuditadaSchema>;

/**
 * Contrato del puerto. `registrarAccesoDenegado` sigue escribiendo en el registro técnico;
 * `registrarAccion` tiene adaptador persistente desde el esquema 4.18.
 *
 * Un fallo al auditar NO deshace la operación auditada: quien llama captura el error y
 * continúa. Una bitácora caída no puede bloquear la operación del panel.
 */
export interface AuditoriaPort {
  registrarAccesoDenegado(evento: EventoAccesoDenegado): Promise<void>;
  /**
   * Opcional a propósito (igual que `notificarCambioCorreoConfirmado` de M18): exigirlo
   * obligaría a tocar los dobles de prueba de todos los módulos que ya inyectan el puerto.
   * Quien audita comprueba que el método esté antes de llamarlo.
   */
  registrarAccion?(evento: EventoAccionAuditada): Promise<void>;
}
