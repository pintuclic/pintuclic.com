import { z } from 'zod';

/**
 * ============================================================================
 * CONTRATO DE API REST — M17. Administración, Empleados y Permisos
 * ============================================================================
 * Scope: m17-permisos · Ola 1
 *
 * Regla de Oro #1: Cero código de implementación sin contrato previo.
 * Regla de Oro #11: Tolerancia Cero al tipo `any`.
 *
 * Alcance: 7 de 7 historias (HU-ADM-01 a HU-ADM-07).
 * Fuentes de verdad:
 *   - docs/01_TRANSVERSALES/M17_PERMISOS_Y_ROLES.md
 *   - docs/01_TRANSVERSALES/POLITICAS/politica_HU-ADM-03_control_acceso_servidor.md
 * ============================================================================
 */

/* ───────────────────────────────────────────────────────────────────────────
 * 1. PRIMITIVAS COMPARTIDAS Y ENUMS OFICIALES
 * ─────────────────────────────────────────────────────────────────────────── */

export const correoSchema = z.string().email().max(150).toLowerCase();
export const telefonoSchema = z.string().min(7).max(20);
export const documentoIdentidadSchema = z.string().trim().min(5).max(30);
export const identificadorUsuarioSchema = z.number().int().positive();
export const identificadorPermisoSchema = z.number().int().positive();

/**
 * RN-SEG-01 / RN-ADM-02. Contraseña con complejidad mínima (12 caracteres).
 */
export const contrasenaSchema = z
  .string()
  .min(12, 'La contraseña debe tener al menos 12 caracteres')
  .max(128, 'La contraseña no puede superar los 128 caracteres');

/**
 * Catálogo Maestro Oficial de Códigos de Permiso Atómicos (seed_pintuclic.sql §1.4).
 */
export const CODIGOS_PERMISO = [
  // Catálogo oficial M17
  'catalogo.ver',
  'catalogo.crear',
  'catalogo.editar',
  'catalogo.eliminar',
  'ventas.ver',
  'ventas.gestionar',
  'ventas.exportar',
  'personal.ver',
  'personal.editar',
  'personal.desactivar',
  'seguridad.configurar_sesion',
  'seguridad.gestionar_permisos',
  'seguridad.gestionar_privacidad',
  'configuracion.ver',
  'configuracion.editar',
  'estadisticas.consultar',
  'empresas.validar',
  // Alias legados soportados en seed
  'productos.crear',
  'productos.eliminar',
  'ordenes.ver',
  'usuarios.gestionar',
] as const;

export const codigoPermisoSchema = z.enum(CODIGOS_PERMISO);
export type CodigoPermiso = z.infer<typeof codigoPermisoSchema>;

export const AREA_FUNCIONAL = [
  'catalogo',
  'ventas',
  'personal',
  'seguridad',
  'configuracion',
  'estadisticas',
] as const;
export const areaFuncionalSchema = z.enum(AREA_FUNCIONAL);
export type AreaFuncional = z.infer<typeof areaFuncionalSchema>;

export const ESTADO_CUENTA_EMPLEADO = ['activo', 'inactivo'] as const;
export const estadoCuentaEmpleadoSchema = z.enum(ESTADO_CUENTA_EMPLEADO);
export type EstadoCuentaEmpleado = z.infer<typeof estadoCuentaEmpleadoSchema>;

export const ESTADO_CUENTA_CLIENTE = ['activo', 'inactivo', 'bloqueado', 'pendiente'] as const;
export const estadoCuentaClienteSchema = z.enum(ESTADO_CUENTA_CLIENTE);
export type EstadoCuentaCliente = z.infer<typeof estadoCuentaClienteSchema>;

export const TIPO_CUENTA_CLIENTE = ['normal', 'empresa'] as const;
export const tipoCuentaClienteSchema = z.enum(TIPO_CUENTA_CLIENTE);
export type TipoCuentaCliente = z.infer<typeof tipoCuentaClienteSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 2. ENVELOPES CANÓNICOS Y CÓDIGOS SEMÁNTICOS DE ERROR
 * ─────────────────────────────────────────────────────────────────────────── */

export const CODIGOS_ERROR_M17 = {
  ACCESO_DENEGADO: 'ACCESO_DENEGADO',
  EMPLEADO_NO_ENCONTRADO: 'EMPLEADO_NO_ENCONTRADO',
  CLIENTE_NO_ENCONTRADO: 'CLIENTE_NO_ENCONTRADO',
  CORREO_DUPLICADO: 'CORREO_DUPLICADO',
  PARAMETRO_INVALIDO: 'PARAMETRO_INVALIDO',
  OPERACION_BLOQUEADA_ADMIN: 'OPERACION_BLOQUEADA_ADMIN',
  MOTIVO_REQUERIDO: 'MOTIVO_REQUERIDO',
  DATOS_CLIENTE_NO_EDITABLES: 'DATOS_CLIENTE_NO_EDITABLES',
  TOKEN_INVALIDO_O_EXPIRADO: 'TOKEN_INVALIDO_O_EXPIRADO',
  ERROR_INTERNO: 'ERROR_INTERNO',
} as const;

export const codigoErrorM17Schema = z.enum([
  CODIGOS_ERROR_M17.ACCESO_DENEGADO,
  CODIGOS_ERROR_M17.EMPLEADO_NO_ENCONTRADO,
  CODIGOS_ERROR_M17.CLIENTE_NO_ENCONTRADO,
  CODIGOS_ERROR_M17.CORREO_DUPLICADO,
  CODIGOS_ERROR_M17.PARAMETRO_INVALIDO,
  CODIGOS_ERROR_M17.OPERACION_BLOQUEADA_ADMIN,
  CODIGOS_ERROR_M17.MOTIVO_REQUERIDO,
  CODIGOS_ERROR_M17.DATOS_CLIENTE_NO_EDITABLES,
  CODIGOS_ERROR_M17.TOKEN_INVALIDO_O_EXPIRADO,
  CODIGOS_ERROR_M17.ERROR_INTERNO,
]);

export const errorResponseEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: codigoErrorM17Schema,
    message: z.string(),
    details: z.unknown().nullable(),
  }),
});
export type ErrorResponseEnvelope = z.infer<typeof errorResponseEnvelopeSchema>;

/**
 * RN-ADM-12 / CA-ADM-03-03: OPACIDAD ABSOLUTA ANTE ACCESOS NO AUTORIZADOS.
 * Objeto canónico exacto que el middleware devuelve ante cualquier rechazo 403,
 * sin revelar si el recurso existía ni qué permiso faltaba.
 */
export const RESPUESTA_ACCESO_DENEGADO_OPACA: ErrorResponseEnvelope = {
  success: false,
  error: {
    code: CODIGOS_ERROR_M17.ACCESO_DENEGADO,
    message: 'No dispone de autorización para realizar esta acción.',
    details: null,
  },
};

/* ───────────────────────────────────────────────────────────────────────────
 * 3. CONTRATOS HU-ADM-01: GESTIÓN DE CUENTAS DE EMPLEADO
 * ─────────────────────────────────────────────────────────────────────────── */

export const crearEmpleadoInputSchema = z.object({
  nombre: z.string().trim().min(3).max(150),
  documento: documentoIdentidadSchema,
  correo: correoSchema,
  telefono: telefonoSchema,
});
export type CrearEmpleadoInput = z.infer<typeof crearEmpleadoInputSchema>;

export const crearEmpleadoOutputSchema = z.object({
  idUsuario: identificadorUsuarioSchema,
  nombre: z.string(),
  correo: correoSchema,
  telefono: z.string().nullable(),
  estado: estadoCuentaEmpleadoSchema,
  primerAccesoPendiente: z.boolean(),
  fechaCreacion: z.string().datetime(),
});
export type CrearEmpleadoOutput = z.infer<typeof crearEmpleadoOutputSchema>;

export const editarEmpleadoInputSchema = z.object({
  nombre: z.string().trim().min(3).max(150).optional(),
  telefono: telefonoSchema.optional(),
});
export type EditarEmpleadoInput = z.infer<typeof editarEmpleadoInputSchema>;

export const listarEmpleadosQuerySchema = z.object({
  estado: estadoCuentaEmpleadoSchema.optional(),
  busqueda: z.string().max(100).optional(),
  pagina: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListarEmpleadosQuery = z.infer<typeof listarEmpleadosQuerySchema>;

export const resumenEmpleadoSchema = z.object({
  idUsuario: identificadorUsuarioSchema,
  nombre: z.string(),
  correo: correoSchema,
  telefono: z.string().nullable(),
  estado: estadoCuentaEmpleadoSchema,
  fechaCreacion: z.string().datetime(),
  fechaUltimoAcceso: z.string().datetime().nullable(),
  cantidadPermisos: z.number().int().nonnegative(),
});
export type ResumenEmpleado = z.infer<typeof resumenEmpleadoSchema>;

export const listarEmpleadosOutputSchema = z.object({
  empleados: z.array(resumenEmpleadoSchema),
  total: z.number().int().nonnegative(),
  pagina: z.number().int().positive(),
  totalPaginas: z.number().int().nonnegative(),
});
export type ListarEmpleadosOutput = z.infer<typeof listarEmpleadosOutputSchema>;

export const primerAccesoEmpleadoInputSchema = z.object({
  credencialTemporal: z.string().min(8),
  nuevaContrasena: contrasenaSchema,
});
export type PrimerAccesoEmpleadoInput = z.infer<typeof primerAccesoEmpleadoInputSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 4. CONTRATOS HU-ADM-02: ASIGNACIÓN INDIVIDUAL DE PERMISOS
 * ─────────────────────────────────────────────────────────────────────────── */

export const itemPermisoCatalogoSchema = z.object({
  idPermiso: identificadorPermisoSchema,
  codigo: codigoPermisoSchema,
  descripcion: z.string().nullable(),
  area: areaFuncionalSchema,
  concedido: z.boolean(),
});
export type ItemPermisoCatalogo = z.infer<typeof itemPermisoCatalogoSchema>;

export const fichaPermisosEmpleadoOutputSchema = z.object({
  idUsuario: identificadorUsuarioSchema,
  nombre: z.string(),
  correo: correoSchema,
  permisos: z.array(itemPermisoCatalogoSchema),
});
export type FichaPermisosEmpleadoOutput = z.infer<typeof fichaPermisosEmpleadoOutputSchema>;

export const actualizarPermisosEmpleadoInputSchema = z.object({
  permisos: z.array(codigoPermisoSchema),
});
export type ActualizarPermisosEmpleadoInput = z.infer<typeof actualizarPermisosEmpleadoInputSchema>;

export const actualizarPermisosEmpleadoOutputSchema = z.object({
  idUsuario: identificadorUsuarioSchema,
  permisosOtorgados: z.array(codigoPermisoSchema),
  permisosConcedidosAutomaticamente: z.array(codigoPermisoSchema),
  permisosRevocadosEnCascada: z.array(codigoPermisoSchema),
  totalPermisosActivos: z.number().int().nonnegative(),
});
export type ActualizarPermisosEmpleadoOutput = z.infer<typeof actualizarPermisosEmpleadoOutputSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 5. CONTRATOS HU-ADM-04: GESTIÓN DE CLIENTES DESDE ADMINISTRACIÓN
 * ─────────────────────────────────────────────────────────────────────────── */

export const buscarClientesQuerySchema = z.object({
  termino: z.string().trim().min(2).max(100),
  tipo: z.enum(['todos', 'normal', 'empresa']).default('todos'),
  pagina: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().min(1).max(100).default(20),
});
export type BuscarClientesQuery = z.infer<typeof buscarClientesQuerySchema>;

export const resumenOrdenClienteSchema = z.object({
  idOrden: z.number().int().positive(),
  codigoVisible: z.string(),
  fecha: z.string().datetime(),
  estado: z.string(),
  total: z.number().nonnegative(),
});
export type ResumenOrdenCliente = z.infer<typeof resumenOrdenClienteSchema>;

export const resumenCotizacionClienteSchema = z.object({
  idCotizacion: z.number().int().positive(),
  fecha: z.string().datetime(),
  estado: z.string(),
  total: z.number().nonnegative(),
});
export type ResumenCotizacionCliente = z.infer<typeof resumenCotizacionClienteSchema>;

export const fichaClienteOutputSchema = z.object({
  idUsuario: identificadorUsuarioSchema,
  nombre: z.string(),
  correo: correoSchema,
  telefono: z.string().nullable(),
  tipo: tipoCuentaClienteSchema,
  estado: estadoCuentaClienteSchema,
  fechaRegistro: z.string().datetime(),
  ordenesRecientes: z.array(resumenOrdenClienteSchema),
  cotizacionesRecientes: z.array(resumenCotizacionClienteSchema),
});
export type FichaClienteOutput = z.infer<typeof fichaClienteOutputSchema>;

export const desactivarClienteInputSchema = z.object({
  motivo: z.string().min(5, 'El motivo de desactivación es obligatorio y debe tener al menos 5 caracteres').max(500),
});
export type DesactivarClienteInput = z.infer<typeof desactivarClienteInputSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 6. CONTRATOS HU-ADM-05 Y HU-ADM-07: CONFIGURACIÓN GENERAL Y PARÁMETROS
 * ─────────────────────────────────────────────────────────────────────────── */

export const CLAVES_PARAMETROS = [
  // Autenticación y Verificación (RF-ADM-07-02)
  'auth.vigencia_codigo_registro_minutos',
  'auth.intentos_codigo_registro',
  'auth.complejidad_minima_contrasena',
  'auth.vigencia_enlace_recuperacion_minutos',
  'auth.intentos_fallidos_bloqueo',
  'auth.duracion_bloqueo_minutos',
  // Comunicaciones (RF-ADM-07-03)
  'comms.reintentos_envio_transaccional',
  // Comercial básico (RF-ADM-07-04)
  'comercial.iva_porcentaje',
  'comercial.costo_envio_base',
  'comercial.umbral_envio_gratis',
] as const;

export const claveParametroSchema = z.enum(CLAVES_PARAMETROS);
export type ClaveParametro = z.infer<typeof claveParametroSchema>;

export const areaParametroSchema = z.enum(['autenticacion', 'comunicaciones', 'comercial']);
export type AreaParametro = z.infer<typeof areaParametroSchema>;

export const tipoDatoParametroSchema = z.enum(['numero', 'texto', 'booleano']);
export type TipoDatoParametro = z.infer<typeof tipoDatoParametroSchema>;

export const parametroConfiguracionSchema = z.object({
  clave: claveParametroSchema,
  area: areaParametroSchema,
  tipoDato: tipoDatoParametroSchema,
  valor: z.union([z.number(), z.string(), z.boolean()]),
  descripcion: z.string(),
  valorPorDefecto: z.union([z.number(), z.string(), z.boolean()]),
  rangoMinimo: z.number().optional(),
  rangoMaximo: z.number().optional(),
  fechaActualizacion: z.string().datetime(),
});
export type ParametroConfiguracion = z.infer<typeof parametroConfiguracionSchema>;

export const catalogoParametrosOutputSchema = z.object({
  parametros: z.array(parametroConfiguracionSchema),
});
export type CatalogoParametrosOutput = z.infer<typeof catalogoParametrosOutputSchema>;

export const actualizarParametroInputSchema = z.object({
  valor: z.union([z.number(), z.string(), z.boolean()]),
});
export type ActualizarParametroInput = z.infer<typeof actualizarParametroInputSchema>;

export const actualizarParametroOutputSchema = z.object({
  clave: claveParametroSchema,
  valorAnterior: z.union([z.number(), z.string(), z.boolean()]),
  valorNuevo: z.union([z.number(), z.string(), z.boolean()]),
  fechaActualizacion: z.string().datetime(),
});
export type ActualizarParametroOutput = z.infer<typeof actualizarParametroOutputSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 7. CONTRATOS HU-ADM-06: GOBERNANZA DE LA CUENTA ADMINISTRADORA
 * ─────────────────────────────────────────────────────────────────────────── */

export const solicitarSustitucionCorreoAdminInputSchema = z.object({
  nuevoCorreo: correoSchema,
});
export type SolicitarSustitucionCorreoAdminInput = z.infer<typeof solicitarSustitucionCorreoAdminInputSchema>;

export const confirmarSustitucionCorreoAdminInputSchema = z.object({
  tokenConfirmacion: z.string().min(16),
});
export type ConfirmarSustitucionCorreoAdminInput = z.infer<typeof confirmarSustitucionCorreoAdminInputSchema>;

export const primerAccesoAdminInputSchema = z.object({
  credencialTemporal: z.string().min(8),
  nuevaContrasena: contrasenaSchema,
});
export type PrimerAccesoAdminInput = z.infer<typeof primerAccesoAdminInputSchema>;
