import { z } from 'zod';

/**
 * ============================================================================
 * CONTRATO DE API REST — M04. Cuentas, Autenticación y Perfil
 * ============================================================================
 * Scope: m04-cuentas · Ola 3 (Salto de Ola Autorizado) · Gate 2
 * Responsable: Software Architect Lead
 *
 * Regla de Oro #1: Cero código sin contrato previo.
 * Regla de Oro #11: Tolerancia Cero al tipo `any`.
 *
 * Fuente funcional: .sdlc/docs/modules/M04/01_SPEC_FUNCIONAL.md
 * Historias de usuario: .sdlc/docs/modules/M04/02_HISTORIAS_USUARIO.md
 * ============================================================================
 */

/* ───────────────────────────────────────────────────────────────────────────
 * 1. PRIMITIVAS COMPARTIDAS Y REGLAS DE SEGURIDAD
 * ─────────────────────────────────────────────────────────────────────────── */

/** RN-SEG-01 / RN-CUE-01: Contraseña con complejidad mínima de 12 caracteres */
export const contrasenaSchema = z
  .string()
  .min(12, 'La contraseña debe tener al menos 12 caracteres')
  .max(128, 'La contraseña no puede superar los 128 caracteres');

/** RN-CUE-01: Correo normalizado en minúsculas sin espacios */
export const correoSchema = z
  .string()
  .trim()
  .email('El correo electrónico no tiene un formato válido')
  .max(150, 'El correo no puede exceder 150 caracteres')
  .toLowerCase();

export const telefonoSchema = z
  .string()
  .trim()
  .min(7, 'El teléfono debe tener al menos 7 dígitos')
  .max(20, 'El teléfono no puede exceder 20 caracteres');

export const nombreSchema = z
  .string()
  .trim()
  .min(2, 'El nombre debe tener al menos 2 caracteres')
  .max(150, 'El nombre no puede exceder 150 caracteres');

/**
 * RN-CUE-14 / RFC-M04-001: el contrato normaliza el NIT antes de compararlo o
 * guardarlo. Se quitan espacios y puntos (separadores de miles: "900.555.666-1" y
 * "900555666-1" son el mismo NIT); el guion del dígito de verificación se conserva
 * tal cual, porque el formato definitivo lo fija el Product Owner.
 */
export const normalizarNit = (nit: string): string => nit.replace(/[\s.]/g, '');

export const nitSchema = z
  .string()
  .transform(normalizarNit)
  .pipe(
    z
      .string()
      .min(5, 'El NIT debe tener al menos 5 caracteres')
      .max(30, 'El NIT no puede exceder 30 caracteres'),
  );

export const codigoOtpSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'El código de verificación debe contener exactamente 6 dígitos numéricos');

export const idUuidSchema = z.string().uuid('Identificador UUID inválido');
export const idUsuarioSchema = z.number().int().positive('Identificador de usuario inválido');

export const tipoUsuarioSchema = z.enum(['normal', 'empresa']);
export type TipoUsuario = z.infer<typeof tipoUsuarioSchema>;

export const estadoUsuarioSchema = z.enum(['activo', 'inactivo', 'bloqueado', 'pendiente']);
export type EstadoUsuario = z.infer<typeof estadoUsuarioSchema>;

export const tipoSolicitudEmpresaSchema = z.enum(['registro', 'ascenso_particular']);
export type TipoSolicitudEmpresa = z.infer<typeof tipoSolicitudEmpresaSchema>;

export const estadoSolicitudEmpresaSchema = z.enum(['pendiente', 'aprobada', 'rechazada']);
export type EstadoSolicitudEmpresa = z.infer<typeof estadoSolicitudEmpresaSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 2. ENVELOPES CANÓNICOS Y CÓDIGOS SEMÁNTICOS
 * ─────────────────────────────────────────────────────────────────────────── */

export const CODIGOS_ERROR_CUENTAS = {
  CREDENCIALES_INVALIDAS: 'CREDENCIALES_INVALIDAS',
  CUENTA_BLOQUEADA: 'CUENTA_BLOQUEADA',
  CUENTA_PENDIENTE_ACTIVACION: 'CUENTA_PENDIENTE_ACTIVACION',
  CODIGO_INVALIDO_O_EXPIRADO: 'CODIGO_INVALIDO_O_EXPIRADO',
  MAXIMO_INTENTOS_EXCEDIDO: 'MAXIMO_INTENTOS_EXCEDIDO',
  TOKEN_INVALIDO_O_EXPIRADO: 'TOKEN_INVALIDO_O_EXPIRADO',
  CORREO_YA_REGISTRADO: 'CORREO_YA_REGISTRADO',
  NIT_YA_REGISTRADO: 'NIT_YA_REGISTRADO',
  SOLICITUD_PENDIENTE_EXISTENTE: 'SOLICITUD_PENDIENTE_EXISTENTE',
  LIMITE_DIRECCIONES_ALCANZADO: 'LIMITE_DIRECCIONES_ALCANZADO',
  DIRECCION_DUPLICADA: 'DIRECCION_DUPLICADA',
  ARCHIVO_NO_PERMITIDO: 'ARCHIVO_NO_PERMITIDO',
  ARCHIVO_DEMASIADO_GRANDE: 'ARCHIVO_DEMASIADO_GRANDE',
  NO_AUTORIZADO: 'NO_AUTORIZADO',
  PERMISO_DENEGADO: 'PERMISO_DENEGADO',
  RECURSO_NO_ENCONTRADO: 'RECURSO_NO_ENCONTRADO',
  ERROR_INTERNO: 'ERROR_INTERNO',
} as const;

export const codigoErrorCuentasSchema = z.enum([
  CODIGOS_ERROR_CUENTAS.CREDENCIALES_INVALIDAS,
  CODIGOS_ERROR_CUENTAS.CUENTA_BLOQUEADA,
  CODIGOS_ERROR_CUENTAS.CUENTA_PENDIENTE_ACTIVACION,
  CODIGOS_ERROR_CUENTAS.CODIGO_INVALIDO_O_EXPIRADO,
  CODIGOS_ERROR_CUENTAS.MAXIMO_INTENTOS_EXCEDIDO,
  CODIGOS_ERROR_CUENTAS.TOKEN_INVALIDO_O_EXPIRADO,
  CODIGOS_ERROR_CUENTAS.CORREO_YA_REGISTRADO,
  CODIGOS_ERROR_CUENTAS.NIT_YA_REGISTRADO,
  CODIGOS_ERROR_CUENTAS.SOLICITUD_PENDIENTE_EXISTENTE,
  CODIGOS_ERROR_CUENTAS.LIMITE_DIRECCIONES_ALCANZADO,
  CODIGOS_ERROR_CUENTAS.DIRECCION_DUPLICADA,
  CODIGOS_ERROR_CUENTAS.ARCHIVO_NO_PERMITIDO,
  CODIGOS_ERROR_CUENTAS.ARCHIVO_DEMASIADO_GRANDE,
  CODIGOS_ERROR_CUENTAS.NO_AUTORIZADO,
  CODIGOS_ERROR_CUENTAS.PERMISO_DENEGADO,
  CODIGOS_ERROR_CUENTAS.RECURSO_NO_ENCONTRADO,
  CODIGOS_ERROR_CUENTAS.ERROR_INTERNO,
]);

export const errorResponseEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: codigoErrorCuentasSchema,
    message: z.string(),
    details: z.record(z.string(), z.string()).optional(),
  }),
});
export type ErrorResponseEnvelope = z.infer<typeof errorResponseEnvelopeSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 3. SCHEMAS: HU-CUE-01 REGISTRO B2C Y ACTIVACIÓN OTP
 * ─────────────────────────────────────────────────────────────────────────── */

export const registroClienteRequestSchema = z.object({
  nombre: nombreSchema,
  correo: correoSchema,
  telefono: telefonoSchema,
  contrasena: contrasenaSchema,
});
export type RegistroClienteRequest = z.infer<typeof registroClienteRequestSchema>;

export const registroClienteResponseSchema = z.object({
  mensaje: z.string(),
  correo: correoSchema,
  requiereVerificacion: z.literal(true),
});
export type RegistroClienteResponse = z.infer<typeof registroClienteResponseSchema>;

export const verificarCodigoOtpRequestSchema = z.object({
  correo: correoSchema,
  codigo: codigoOtpSchema,
});
export type VerificarCodigoOtpRequest = z.infer<typeof verificarCodigoOtpRequestSchema>;

export const reenviarCodigoOtpRequestSchema = z.object({
  correo: correoSchema,
});
export type ReenviarCodigoOtpRequest = z.infer<typeof reenviarCodigoOtpRequestSchema>;

export const activacionCuentaResponseSchema = z.object({
  mensaje: z.string(),
  activado: z.literal(true),
});
export type ActivacionCuentaResponse = z.infer<typeof activacionCuentaResponseSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 4. SCHEMAS: HU-CUE-02 AUTENTICACIÓN GOOGLE IDENTITY
 * ─────────────────────────────────────────────────────────────────────────── */

export const loginGoogleRequestSchema = z.object({
  idToken: z.string().min(10, 'El token de Google es requerido'),
});
export type LoginGoogleRequest = z.infer<typeof loginGoogleRequestSchema>;

export const loginGoogleResponseSchema = z.object({
  registrado: z.boolean(),
  tokenRegistroTemporal: z.string().optional(),
  usuario: z
    .object({
      idUsuario: idUsuarioSchema,
      nombre: nombreSchema,
      correo: correoSchema,
      tipo: tipoUsuarioSchema,
    })
    .optional(),
});
export type LoginGoogleResponse = z.infer<typeof loginGoogleResponseSchema>;

export const completarRegistroGoogleRequestSchema = z.object({
  tokenRegistroTemporal: z.string().min(10, 'Token temporal requerido'),
  telefono: telefonoSchema,
  contrasena: contrasenaSchema,
});
export type CompletarRegistroGoogleRequest = z.infer<typeof completarRegistroGoogleRequestSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 5. SCHEMAS: HU-CUE-03 REGISTRO DE CUENTA EMPRESA B2B
 * ─────────────────────────────────────────────────────────────────────────── */

export const registroEmpresaRequestSchema = z.object({
  nombreEmpresa: nombreSchema,
  nit: nitSchema,
  nombreRepresentante: nombreSchema,
  correoEmpresarial: correoSchema,
  telefono: telefonoSchema,
  contrasena: contrasenaSchema,
});
export type RegistroEmpresaRequest = z.infer<typeof registroEmpresaRequestSchema>;

export const registroEmpresaResponseSchema = z.object({
  idSolicitud: idUuidSchema,
  mensaje: z.string(),
  estado: z.literal('pendiente'),
});
export type RegistroEmpresaResponse = z.infer<typeof registroEmpresaResponseSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 6. SCHEMAS: HU-CUE-04 INICIO DE SESIÓN Y GESTIÓN DE SESIONES
 * ─────────────────────────────────────────────────────────────────────────── */

export const loginRequestSchema = z.object({
  correo: correoSchema,
  contrasena: z.string().min(1, 'La contraseña es requerida'),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const loginResponseSchema = z.object({
  usuario: z.object({
    idUsuario: idUsuarioSchema,
    nombre: nombreSchema,
    correo: correoSchema,
    tipo: tipoUsuarioSchema,
    esAdmin: z.boolean().optional(),
  }),
  cambioContrasenaPendiente: z.boolean(),
});
export type LoginResponse = z.infer<typeof loginResponseSchema>;

export const cambioContrasenaPrimerAccesoRequestSchema = z.object({
  contrasenaActual: z.string().min(1, 'La contraseña actual es requerida'),
  nuevaContrasena: contrasenaSchema,
});
export type CambioContrasenaPrimerAccesoRequest = z.infer<typeof cambioContrasenaPrimerAccesoRequestSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 7. SCHEMAS: HU-CUE-05 RECUPERACIÓN DE CONTRASEÑA
 * ─────────────────────────────────────────────────────────────────────────── */

export const solicitarRecuperacionPasswordRequestSchema = z.object({
  correo: correoSchema,
});
export type SolicitarRecuperacionPasswordRequest = z.infer<typeof solicitarRecuperacionPasswordRequestSchema>;

export const restablecerPasswordRequestSchema = z.object({
  token: z.string().min(10, 'El token de recuperación es requerido'),
  nuevaContrasena: contrasenaSchema,
});
export type RestablecerPasswordRequest = z.infer<typeof restablecerPasswordRequestSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 8. SCHEMAS: HU-CUE-06 GESTIÓN DE PERFIL, CREDENCIALES Y ASCENSO
 * ─────────────────────────────────────────────────────────────────────────── */

export const actualizarDatosPerfilRequestSchema = z.object({
  nombre: nombreSchema,
  telefono: telefonoSchema,
});
export type ActualizarDatosPerfilRequest = z.infer<typeof actualizarDatosPerfilRequestSchema>;

export const cambiarContrasenaPerfilRequestSchema = z.object({
  contrasenaActual: z.string().min(1, 'La contraseña actual es requerida'),
  nuevaContrasena: contrasenaSchema,
});
export type CambiarContrasenaPerfilRequest = z.infer<typeof cambiarContrasenaPerfilRequestSchema>;

export const solicitarCambioCorreoRequestSchema = z.object({
  nuevoCorreo: correoSchema,
  contrasena: z.string().min(1, 'La contraseña es requerida para confirmar el cambio'),
});
export type SolicitarCambioCorreoRequest = z.infer<typeof solicitarCambioCorreoRequestSchema>;

export const confirmarCambioCorreoRequestSchema = z.object({
  nuevoCorreo: correoSchema,
  codigo: codigoOtpSchema,
});
export type ConfirmarCambioCorreoRequest = z.infer<typeof confirmarCambioCorreoRequestSchema>;

export const solicitarAscensoEmpresaRequestSchema = z.object({
  nombreEmpresa: nombreSchema,
  nit: nitSchema,
  nombreRepresentante: nombreSchema,
  correoEmpresarial: correoSchema,
  telefono: telefonoSchema,
});
export type SolicitarAscensoEmpresaRequest = z.infer<typeof solicitarAscensoEmpresaRequestSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 9. SCHEMAS: HU-CUE-07 LIBRETA DE DIRECCIONES DE ENTREGA
 * ─────────────────────────────────────────────────────────────────────────── */

export const direccionClienteItemSchema = z.object({
  idDireccion: idUuidSchema,
  idUsuario: idUsuarioSchema,
  direccion: z.string().trim().min(5).max(255),
  barrio: z.string().trim().min(2).max(100),
  apartamentoCasa: z.string().trim().max(100).nullable().optional(),
  nombreApellido: nombreSchema,
  telefono: telefonoSchema,
  esPredeterminada: z.boolean(),
  latitud: z.number().nullable().optional(),
  longitud: z.number().nullable().optional(),
  fechaCreacion: z.string().datetime().optional(),
  fechaActualizacion: z.string().datetime().optional(),
});
export type DireccionClienteItem = z.infer<typeof direccionClienteItemSchema>;

export const crearDireccionRequestSchema = z.object({
  direccion: z.string().trim().min(5, 'La dirección debe tener al menos 5 caracteres').max(255),
  barrio: z.string().trim().min(2, 'El barrio debe tener al menos 2 caracteres').max(100),
  apartamentoCasa: z.string().trim().max(100).optional(),
  nombreApellido: nombreSchema,
  telefono: telefonoSchema,
  esPredeterminada: z.boolean().default(false),
  latitud: z.number().min(-90).max(90).optional(),
  longitud: z.number().min(-180).max(180).optional(),
});
export type CrearDireccionRequest = z.infer<typeof crearDireccionRequestSchema>;

export const actualizarDireccionRequestSchema = crearDireccionRequestSchema.partial();
export type ActualizarDireccionRequest = z.infer<typeof actualizarDireccionRequestSchema>;

export const listarDireccionesResponseSchema = z.array(direccionClienteItemSchema);
export type ListarDireccionesResponse = z.infer<typeof listarDireccionesResponseSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 10. SCHEMAS: HU-CUE-08 CONSULTA DE ESTADO DE CUENTA
 * ─────────────────────────────────────────────────────────────────────────── */

export const cuentaEmpresaDetalleSchema = z.object({
  nit: nitSchema,
  nombreEmpresa: nombreSchema,
  nombreRepresentante: nombreSchema,
  correoEmpresarial: correoSchema,
  telefono: telefonoSchema,
  fechaAprobacion: z.string().datetime(),
});
export type CuentaEmpresaDetalle = z.infer<typeof cuentaEmpresaDetalleSchema>;

export const perfilUsuarioResponseSchema = z.object({
  idUsuario: idUsuarioSchema,
  nombre: nombreSchema,
  correo: correoSchema,
  telefono: telefonoSchema.nullable(),
  tipo: tipoUsuarioSchema,
  esAdmin: z.boolean().optional(),
  estado: estadoUsuarioSchema,
  cambioContrasenaPendiente: z.boolean(),
  empresa: cuentaEmpresaDetalleSchema.nullable().optional(),
});
export type PerfilUsuarioResponse = z.infer<typeof perfilUsuarioResponseSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 11. SCHEMAS: HU-CUE-09 ADMINISTRACIÓN DE SOLICITUDES CORPORATIVAS
 * ─────────────────────────────────────────────────────────────────────────── */

export const solicitudEmpresaItemSchema = z.object({
  idSolicitud: idUuidSchema,
  idUsuario: idUsuarioSchema,
  nombreEmpresa: nombreSchema,
  nombreRepresentante: nombreSchema,
  correoEmpresarial: correoSchema,
  telefono: telefonoSchema,
  nit: nitSchema,
  tipoSolicitud: tipoSolicitudEmpresaSchema,
  estado: estadoSolicitudEmpresaSchema,
  motivoRechazo: z.string().nullable().optional(),
  idAdminRevisor: idUsuarioSchema.nullable().optional(),
  fechaSolicitud: z.string().datetime(),
  fechaRevision: z.string().datetime().nullable().optional(),
});
export type SolicitudEmpresaItem = z.infer<typeof solicitudEmpresaItemSchema>;

/**
 * Dictamen administrativo (aprobar o rechazar).
 *
 * El motivo es OPCIONAL en el contrato (decisión del Director Humano, 2026-10-22).
 * La excepción es el rechazo de un REGISTRO de empresa, donde RN-CUE-17 lo exige:
 * esa regla depende del tipo de solicitud, que solo conoce el servidor, y se aplica
 * en `EmpresasService.dictaminarSolicitud` (MOTIVO_RECHAZO_REQUERIDO).
 */
export const dictamenSolicitudEmpresaRequestSchema = z.object({
  decision: z.enum(['aprobar', 'rechazar']),
  motivoRechazo: z.string().trim().max(500).optional(),
});
export type DictamenSolicitudEmpresaRequest = z.infer<typeof dictamenSolicitudEmpresaRequestSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 12. SCHEMAS: HU-CUE-10 RENOVACIÓN DE NIT Y RUT ADJUNTO
 * ─────────────────────────────────────────────────────────────────────────── */

export const documentoSoporteMetaSchema = z.object({
  idDocumento: idUuidSchema,
  nombreOriginal: z.string().max(255),
  tipoMime: z.enum(['application/pdf', 'image/jpeg', 'image/png']),
  tamanoBytes: z.number().int().positive().max(5242880, 'El archivo no puede exceder 5 MB'),
  sha256: z.string().length(64, 'Huella SHA-256 debe contener 64 caracteres hexadecimales'),
  fechaCarga: z.string().datetime().optional(),
});
export type DocumentoSoporteMeta = z.infer<typeof documentoSoporteMetaSchema>;

export const solicitarRenovacionNitRequestSchema = z.object({
  nitNuevo: nitSchema,
  nombreOriginal: z.string().max(255),
  tipoMime: z.enum(['application/pdf', 'image/jpeg', 'image/png']),
  tamanoBytes: z.number().int().positive().max(5242880),
  sha256: z.string().length(64),
  contenidoBase64: z.string().min(1, 'El contenido del RUT es requerido'),
});
export type SolicitarRenovacionNitRequest = z.infer<typeof solicitarRenovacionNitRequestSchema>;

export const solicitudActualizacionNitItemSchema = z.object({
  idSolicitud: idUuidSchema,
  idUsuario: idUsuarioSchema,
  nitAnterior: nitSchema,
  nitNuevo: nitSchema,
  idDocumento: idUuidSchema.nullable(),
  estado: estadoSolicitudEmpresaSchema,
  motivoRechazo: z.string().nullable().optional(),
  fechaSolicitud: z.string().datetime(),
  fechaRevision: z.string().datetime().nullable().optional(),
  documento: documentoSoporteMetaSchema.optional(),
});
export type SolicitudActualizacionNitItem = z.infer<typeof solicitudActualizacionNitItemSchema>;

export const listarSolicitudesEmpresaQuerySchema = z.object({
  estado: estadoSolicitudEmpresaSchema.optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});
export type ListarSolicitudesEmpresaQuery = z.infer<typeof listarSolicitudesEmpresaQuerySchema>;

export const dictamenRenovacionNitRequestSchema = dictamenSolicitudEmpresaRequestSchema;
export type DictamenRenovacionNitRequest = z.infer<typeof dictamenRenovacionNitRequestSchema>;

export const desactivarCuentaRequestSchema = z.object({
  contrasena: z.string().min(1, 'La contraseña es requerida para confirmar la desactivación'),
});
export type DesactivarCuentaRequest = z.infer<typeof desactivarCuentaRequestSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 13. ENVELOPE GENÉRICO DE RESPUESTA EXITOSA
 * ─────────────────────────────────────────────────────────────────────────── */

export const genericResponseEnvelopeSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    message: z.string().optional(),
  });

export const baseSuccessResponseSchema = z.object({
  success: z.literal(true),
  message: z.string().optional(),
});
export type BaseSuccessResponse = z.infer<typeof baseSuccessResponseSchema>;

