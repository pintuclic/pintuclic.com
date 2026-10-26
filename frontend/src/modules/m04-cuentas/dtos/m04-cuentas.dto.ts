import { z } from 'zod';
import { telefonoSchema } from '@/core/dtos/telefono.dto';

/**
 * ============================================================================
 * DTOs Y ESQUEMAS DE VALIDACIÓN FRONTEND — M04. Cuentas, Autenticación y Perfil
 * ============================================================================
 * Espejo fiel de `contracts/m04-cuentas.contract.ts` para ejecución
 * en componentes React / Next.js bajo react-hook-form y zodResolver.
 * Directiva #12: Prohibido declarar esquemas Zod inline en componentes .tsx.
 * ============================================================================
 */

/* ───────────────────────────────────────────────────────────────────────────
 * 1. PRIMITIVAS COMPARTIDAS
 * ─────────────────────────────────────────────────────────────────────────── */

export const contrasenaSchema = z
  .string()
  .min(12, 'La contraseña debe tener al menos 12 caracteres')
  .max(128, 'La contraseña no puede superar los 128 caracteres');

export const correoSchema = z
  .string()
  .trim()
  .email('El correo electrónico no tiene un formato válido')
  .max(150, 'El correo no puede exceder 150 caracteres')
  .toLowerCase();

/** Regla transversal del teléfono (registro, perfil, empresa y direcciones): vive en `core/dtos`. */
export { telefonoSchema };

export const nombreSchema = z
  .string()
  .trim()
  .min(2, 'El nombre debe tener al menos 2 caracteres')
  .max(150, 'El nombre no puede exceder 150 caracteres');

/** Misma regla que el contrato (RN-CUE-14): sin espacios ni puntos y con guion obligatorio. */
export const normalizarNit = (nit: string): string => nit.replace(/[\s.]/g, '');

export const FORMATO_NIT = /^\d{5,15}-\d$/;

export const nitSchema = z
  .string()
  .transform(normalizarNit)
  .pipe(
    z
      .string()
      .regex(FORMATO_NIT, 'El NIT debe tener el formato 900123456-7, con guion antes del dígito de verificación'),
  );

export const codigoOtpSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'El código debe contener exactamente 6 dígitos numéricos');

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
 * 2. CÓDIGOS DE ERROR
 * ─────────────────────────────────────────────────────────────────────────── */

export const CODIGOS_ERROR_CUENTAS = {
  CREDENCIALES_INVALIDAS: 'CREDENCIALES_INVALIDAS',
  /** Contraseña errónea en el perfil, con sesión abierta: no revela nada que el usuario no sepa. */
  CONTRASENA_INCORRECTA: 'CONTRASENA_INCORRECTA',
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
  DATOS_INVALIDOS: 'DATOS_INVALIDOS',
  ERROR_INTERNO: 'ERROR_INTERNO',
} as const;

/* ───────────────────────────────────────────────────────────────────────────
 * 3. SCHEMAS DE FORMULARIOS: HU-CUE-01 REGISTRO B2C Y ACTIVACIÓN
 * ─────────────────────────────────────────────────────────────────────────── */

/**
 * Aceptación de términos (mockup de registro). Decisión del Director (2026-10-22):
 * se valida solo en el cliente; el backend aún no registra el consentimiento.
 */
export const aceptaTerminosSchema = z
  .boolean()
  .refine((acepta) => acepta, {
    message: 'Debes aceptar los Términos y Condiciones y la Política de Tratamiento de Datos',
  });

/** Registro de persona natural (mockup pág. 3): una sola contraseña, con mostrar/ocultar. */
export const registroClienteFormSchema = z.object({
  nombre: nombreSchema,
  correo: correoSchema,
  telefono: telefonoSchema,
  contrasena: contrasenaSchema,
  aceptaTerminos: aceptaTerminosSchema,
});
export type RegistroClienteFormData = z.infer<typeof registroClienteFormSchema>;

/** Paso 2 del registro: el correo y el identificador de verificación vienen del paso 1. */
export const verificarCodigoOtpFormSchema = z.object({
  codigo: codigoOtpSchema,
});
export type VerificarCodigoOtpFormData = z.infer<typeof verificarCodigoOtpFormSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 4. SCHEMAS DE FORMULARIOS: HU-CUE-02 GOOGLE IDENTITY
 * ─────────────────────────────────────────────────────────────────────────── */

export const completarRegistroGoogleFormSchema = z
  .object({
    telefono: telefonoSchema,
    contrasena: contrasenaSchema,
    confirmarContrasena: z.string().min(1, 'Debe confirmar su contraseña'),
  })
  .refine((data) => data.contrasena === data.confirmarContrasena, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmarContrasena'],
  });
export type CompletarRegistroGoogleFormData = z.infer<typeof completarRegistroGoogleFormSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 5. SCHEMAS DE FORMULARIOS: HU-CUE-03 REGISTRO EMPRESA B2B
 * ─────────────────────────────────────────────────────────────────────────── */

/** Registro de empresa (mockup pág. 4): sin paso de verificación; lo valida el administrador. */
export const registroEmpresaFormSchema = z.object({
  nombreEmpresa: nombreSchema,
  nombreRepresentante: nombreSchema,
  correoEmpresarial: correoSchema,
  telefono: telefonoSchema,
  nit: nitSchema,
  contrasena: contrasenaSchema,
  aceptaTerminos: aceptaTerminosSchema,
});
export type RegistroEmpresaFormData = z.infer<typeof registroEmpresaFormSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 6. SCHEMAS DE FORMULARIOS: HU-CUE-04 LOGIN
 * ─────────────────────────────────────────────────────────────────────────── */

export const loginFormSchema = z.object({
  correo: correoSchema,
  contrasena: z.string().min(1, 'La contraseña es requerida'),
});
export type LoginFormData = z.infer<typeof loginFormSchema>;

export const cambioContrasenaPrimerAccesoFormSchema = z
  .object({
    contrasenaActual: z.string().min(1, 'La contraseña temporal es requerida'),
    nuevaContrasena: contrasenaSchema,
    confirmarNuevaContrasena: z.string().min(1, 'Debe confirmar su nueva contraseña'),
  })
  .refine((data) => data.nuevaContrasena === data.confirmarNuevaContrasena, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmarNuevaContrasena'],
  })
  .refine((data) => data.nuevaContrasena !== data.contrasenaActual, {
    message: 'La nueva contraseña debe ser distinta de la temporal',
    path: ['nuevaContrasena'],
  });
export type CambioContrasenaPrimerAccesoFormData = z.infer<typeof cambioContrasenaPrimerAccesoFormSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 7. SCHEMAS DE FORMULARIOS: HU-CUE-05 RECUPERACIÓN DE CONTRASEÑA
 * ─────────────────────────────────────────────────────────────────────────── */

export const solicitarRecuperacionPasswordFormSchema = z.object({
  correo: correoSchema,
});
export type SolicitarRecuperacionPasswordFormData = z.infer<typeof solicitarRecuperacionPasswordFormSchema>;

export const restablecerPasswordFormSchema = z
  .object({
    nuevaContrasena: contrasenaSchema,
    confirmarNuevaContrasena: z.string().min(1, 'Debe confirmar su contraseña'),
  })
  .refine((data) => data.nuevaContrasena === data.confirmarNuevaContrasena, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmarNuevaContrasena'],
  });
export type RestablecerPasswordFormData = z.infer<typeof restablecerPasswordFormSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 8. SCHEMAS DE FORMULARIOS: HU-CUE-06 PERFIL
 * ─────────────────────────────────────────────────────────────────────────── */

export const actualizarDatosPerfilFormSchema = z.object({
  nombre: nombreSchema,
  telefono: telefonoSchema,
});
export type ActualizarDatosPerfilFormData = z.infer<typeof actualizarDatosPerfilFormSchema>;

export const cambiarContrasenaPerfilFormSchema = z
  .object({
    contrasenaActual: z.string().min(1, 'La contraseña actual es requerida'),
    nuevaContrasena: contrasenaSchema,
    confirmarNuevaContrasena: z.string().min(1, 'Debe confirmar su contraseña'),
  })
  .refine((data) => data.nuevaContrasena === data.confirmarNuevaContrasena, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmarNuevaContrasena'],
  });
export type CambiarContrasenaPerfilFormData = z.infer<typeof cambiarContrasenaPerfilFormSchema>;

export const solicitarCambioCorreoFormSchema = z.object({
  nuevoCorreo: correoSchema,
  contrasena: z.string().min(1, 'La contraseña es requerida'),
});
export type SolicitarCambioCorreoFormData = z.infer<typeof solicitarCambioCorreoFormSchema>;

export const confirmarCambioCorreoFormSchema = z.object({
  codigo: codigoOtpSchema,
});
export type ConfirmarCambioCorreoFormData = z.infer<typeof confirmarCambioCorreoFormSchema>;

export const solicitarAscensoEmpresaFormSchema = z.object({
  nombreEmpresa: nombreSchema,
  nit: nitSchema,
  nombreRepresentante: nombreSchema,
  correoEmpresarial: correoSchema,
  telefono: telefonoSchema,
});
export type SolicitarAscensoEmpresaFormData = z.infer<typeof solicitarAscensoEmpresaFormSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 9. SCHEMAS DE FORMULARIOS: HU-CUE-07 DIRECCIÓN DE ENTREGA
 * ─────────────────────────────────────────────────────────────────────────── */

export const direccionClienteFormSchema = z.object({
  direccion: z.string().trim().min(5, 'La dirección debe tener al menos 5 caracteres').max(255),
  barrio: z.string().trim().min(2, 'El barrio debe tener al menos 2 caracteres').max(100),
  apartamentoCasa: z.string().trim().max(100).optional(),
  nombreApellido: nombreSchema,
  telefono: telefonoSchema,
  esPredeterminada: z.boolean(),
  latitud: z.number().min(-90).max(90).optional(),
  longitud: z.number().min(-180).max(180).optional(),
});
export type DireccionClienteFormData = z.infer<typeof direccionClienteFormSchema>;

/**
 * Respuesta de la geocodificación inversa (Nominatim) con la que se completa la
 * dirección a partir de la ubicación del dispositivo. Solo se leen los campos útiles.
 */
export const geocodificacionInversaSchema = z.object({
  address: z
    .object({
      road: z.string().optional(),
      house_number: z.string().optional(),
      neighbourhood: z.string().optional(),
      quarter: z.string().optional(),
    })
    .optional(),
});
export type GeocodificacionInversa = z.infer<typeof geocodificacionInversaSchema>;

/** Desactivación de la propia cuenta: exige la contraseña actual. */
export const desactivarCuentaFormSchema = z.object({
  contrasena: z.string().min(1, 'La contraseña es requerida para confirmar'),
});
export type DesactivarCuentaFormData = z.infer<typeof desactivarCuentaFormSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 10. SCHEMAS: HU-CUE-08 RESPUESTA DE PERFIL
 * ─────────────────────────────────────────────────────────────────────────── */

export const perfilUsuarioViewSchema = z.object({
  idUsuario: idUsuarioSchema,
  nombre: nombreSchema,
  correo: correoSchema,
  telefono: telefonoSchema.nullable(),
  tipo: tipoUsuarioSchema,
  esAdmin: z.boolean().optional(),
  estado: estadoUsuarioSchema,
  cambioContrasenaPendiente: z.boolean(),
  empresa: z
    .object({
      nit: nitSchema,
      nombreEmpresa: nombreSchema,
      nombreRepresentante: nombreSchema,
      correoEmpresarial: correoSchema,
      telefono: telefonoSchema,
      fechaAprobacion: z.string(),
    })
    .nullable()
    .optional(),
});
export type PerfilUsuarioView = z.infer<typeof perfilUsuarioViewSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 11. SCHEMAS: HU-CUE-09 DICTAMEN DE SOLICITUDES
 * ─────────────────────────────────────────────────────────────────────────── */

/** Dictamen con motivo OPCIONAL: ascensos y renovaciones de NIT (RN-CUE-17). */
export const dictamenSolicitudEmpresaFormSchema = z.object({
  decision: z.enum(['aprobar', 'rechazar']),
  motivoRechazo: z.string().trim().max(500).optional(),
});
export type DictamenSolicitudEmpresaFormData = z.infer<typeof dictamenSolicitudEmpresaFormSchema>;

/** RN-CUE-17: al rechazar un REGISTRO de empresa el motivo es obligatorio (mínimo 10 caracteres). */
export const dictamenRegistroEmpresaFormSchema = dictamenSolicitudEmpresaFormSchema.refine(
  (data) =>
    data.decision !== 'rechazar' ||
    (typeof data.motivoRechazo === 'string' && data.motivoRechazo.length >= 10),
  {
    message: 'Para rechazar un registro de empresa debe justificar con al menos 10 caracteres',
    path: ['motivoRechazo'],
  }
);
export type DictamenRegistroEmpresaFormData = z.infer<typeof dictamenRegistroEmpresaFormSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 12. SCHEMAS: HU-CUE-10 RENOVACIÓN DE NIT
 * ─────────────────────────────────────────────────────────────────────────── */

export const renovacionNitFormSchema = z.object({
  nitNuevo: nitSchema,
});
export type RenovacionNitFormData = z.infer<typeof renovacionNitFormSchema>;
