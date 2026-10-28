import { z } from 'zod';

/**
 * ============================================================================
 * CONTRATO DE API REST: MÓDULO M11 — POSTVENTA (DEVOLUCIONES Y REEMBOLSOS)
 * ============================================================================
 * Regla de Oro #1: Cero código sin contrato previo.
 * Regla de Oro #11: Mandato Zero ANY Innegociable.
 *
 * ── Propósito ───────────────────────────────────────────────────────────────
 * Define tipos, esquemas Zod de validación, envelopes y códigos de error para
 * la gestión de cancelaciones de órdenes, devoluciones por retracto legal
 * (Ley 1480 de 2011), reclamaciones por garantía y liquidación de reembolsos.
 * ============================================================================
 */

/* ───────────────────────────────────────────────────────────────────────────
 * 1. CONSTANTES, ENUMS Y PRIMITIVAS
 * ─────────────────────────────────────────────────────────────────────────── */

export const CODIGO_POSTVENTA_PATRON = /^DEV-\d{4}-\d{5}$/;

export const TIPOS_POSTVENTA = ['cancelacion', 'devolucion', 'garantia'] as const;
export const tipoPostventaSchema = z.enum(TIPOS_POSTVENTA);
export type TipoPostventa = z.infer<typeof tipoPostventaSchema>;

export const ESTADOS_POSTVENTA = [
  'solicitada',
  'en_revision',
  'aprobada',
  'rechazada',
  'reembolsada',
] as const;
export const estadoPostventaSchema = z.enum(ESTADOS_POSTVENTA);
export type EstadoPostventa = z.infer<typeof estadoPostventaSchema>;

export const METODOS_REEMBOLSO = [
  'transferencia_bancaria',
  'reverso_pasarela',
  'saldo_tienda',
  'efectivo',
] as const;
export const metodoReembolsoSchema = z.enum(METODOS_REEMBOLSO);
export type MetodoReembolso = z.infer<typeof metodoReembolsoSchema>;

export const MOTIVOS_RECHAZO_POSTVENTA = [
  'fuera_de_plazo',
  'producto_entonado',
  'producto_abierto_o_danado',
  'evidencia_insuficiente',
  'politica_no_cumplida',
  'otro',
] as const;
export const motivoRechazoPostventaSchema = z.enum(MOTIVOS_RECHAZO_POSTVENTA);
export type MotivoRechazoPostventa = z.infer<typeof motivoRechazoPostventaSchema>;

export const codigoPostventaSchema = z
  .string()
  .trim()
  .regex(CODIGO_POSTVENTA_PATRON, 'El código debe tener el formato DEV-AAAA-NNNNN');

export const codigoOrdenSchema = z
  .string()
  .trim()
  .min(1, 'Indique el código de la orden')
  .max(50, 'Máximo 50 caracteres');

export const importeSchema = z.number().nonnegative('El importe debe ser mayor o igual a 0');
export const fechaHoraSchema = z.string().datetime();

/* ───────────────────────────────────────────────────────────────────────────
 * 2. ESQUEMAS DE ENTRADA (REQUESTS)
 * ─────────────────────────────────────────────────────────────────────────── */

export const datosBancariosInputSchema = z.object({
  banco: z.string().trim().min(2, 'Indique el banco').max(80),
  tipoCuenta: z.enum(['ahorros', 'corriente']),
  numeroCuenta: z.string().trim().min(5, 'Número de cuenta inválido').max(30),
  titularNombre: z.string().trim().min(3, 'Indique el nombre del titular').max(120),
  titularDocumento: z.string().trim().min(5, 'Indique el documento del titular').max(20),
});
export type DatosBancariosInput = z.infer<typeof datosBancariosInputSchema>;

/** HU-POS-01: Cancelación de orden en curso */
export const solicitarCancelacionRequestSchema = z.object({
  codigoOrden: codigoOrdenSchema,
  motivo: z.string().trim().min(10, 'El motivo debe tener al menos 10 caracteres').max(500),
  datosReembolso: datosBancariosInputSchema.optional(),
});
export type SolicitarCancelacionRequest = z.infer<typeof solicitarCancelacionRequestSchema>;

/** HU-POS-02: Línea individual dentro de una devolución o garantía */
export const lineaDevolucionInputSchema = z.object({
  idLineaOrden: z.number().int().positive('Identificador de línea de orden inválido'),
  cantidad: z.number().int().positive('La cantidad debe ser mayor a 0'),
  motivoEspecifico: z.string().trim().max(300).optional(),
});
export type LineaDevolucionInput = z.infer<typeof lineaDevolucionInputSchema>;

/** HU-POS-02: Devolución por retracto o reclamación por garantía */
export const solicitarDevolucionRequestSchema = z.object({
  codigoOrden: codigoOrdenSchema,
  tipo: z.enum(['devolucion', 'garantia']),
  motivoGeneral: z.string().trim().min(10, 'Describa el motivo con al menos 10 caracteres').max(1000),
  lineas: z.array(lineaDevolucionInputSchema).min(1, 'Debe seleccionar al menos un producto'),
  evidenciaUrls: z.array(z.string().url('URL de evidencia inválida')).max(5).optional(),
  datosReembolso: datosBancariosInputSchema.optional(),
});
export type SolicitarDevolucionRequest = z.infer<typeof solicitarDevolucionRequestSchema>;

/** HU-POS-05: Aprobación o rechazo administrativo */
export const resolverSolicitudRequestSchema = z
  .object({
    accion: z.enum(['aprobar', 'rechazar']),
    motivoRechazo: motivoRechazoPostventaSchema.optional(),
    observaciones: z.string().trim().max(1000).optional(),
  })
  .refine((v) => v.accion !== 'rechazar' || !!v.observaciones, {
    message: 'Rechazar la solicitud exige registrar observaciones explicando el motivo',
    path: ['observaciones'],
  });
export type ResolverSolicitudRequest = z.infer<typeof resolverSolicitudRequestSchema>;

/** HU-POS-06: Liquidación y registro del reembolso */
export const registrarReembolsoRequestSchema = z.object({
  metodo: metodoReembolsoSchema,
  montoReembolsado: importeSchema,
  referenciaTransaccion: z.string().trim().min(3, 'Indique la referencia o comprobante').max(100),
  comprobanteUrl: z.string().url('URL de comprobante inválida').optional(),
  notas: z.string().trim().max(500).optional(),
});
export type RegistrarReembolsoRequest = z.infer<typeof registrarReembolsoRequestSchema>;

/** Filtros para consultar solicitudes */
export const paginacionQuerySchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(20),
});

export const listarMisSolicitudesRequestSchema = paginacionQuerySchema.extend({
  estado: estadoPostventaSchema.optional(),
});
export type ListarMisSolicitudesRequest = z.infer<typeof listarMisSolicitudesRequestSchema>;

export const listarGestionPostventaRequestSchema = paginacionQuerySchema.extend({
  codigo: z.string().trim().max(20).optional(),
  codigoOrden: z.string().trim().max(50).optional(),
  estado: estadoPostventaSchema.optional(),
  tipo: tipoPostventaSchema.optional(),
  desde: z.string().date().optional(),
  hasta: z.string().date().optional(),
});
export type ListarGestionPostventaRequest = z.infer<typeof listarGestionPostventaRequestSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 3. ENTIDADES DE SALIDA
 * ─────────────────────────────────────────────────────────────────────────── */

export const lineaPostventaSchema = z.object({
  idLineaPostventa: z.number().int().positive(),
  idLineaOrden: z.number().int().positive(),
  nombreProducto: z.string(),
  varianteCopia: z.string(),
  skuVendido: z.string().nullable(),
  colorSolicitado: z.string().nullable(),
  esEntonado: z.boolean(),
  cantidad: z.number().int().positive(),
  precioUnitario: importeSchema,
  subTotal: importeSchema,
  motivoEspecifico: z.string().nullable(),
});
export type LineaPostventa = z.infer<typeof lineaPostventaSchema>;

export const historialEstadoPostventaSchema = z.object({
  idHistorial: z.number().int().positive(),
  estadoAnterior: estadoPostventaSchema.nullable(),
  estadoNuevo: estadoPostventaSchema,
  motivo: z.string().nullable(),
  nombreAutor: z.string().nullable(),
  fecha: fechaHoraSchema,
});
export type HistorialEstadoPostventa = z.infer<typeof historialEstadoPostventaSchema>;

export const solicitudPostventaResumenSchema = z.object({
  idSolicitud: z.number().int().positive(),
  codigo: codigoPostventaSchema,
  codigoOrden: codigoOrdenSchema,
  idCliente: z.number().int().positive(),
  nombreCliente: z.string(),
  tipo: tipoPostventaSchema,
  estado: estadoPostventaSchema,
  totalReembolso: importeSchema,
  totalItems: z.number().int().nonnegative(),
  fechaSolicitud: fechaHoraSchema,
  fechaResolucion: fechaHoraSchema.nullable(),
});
export type SolicitudPostventaResumen = z.infer<typeof solicitudPostventaResumenSchema>;

export const solicitudPostventaDetalleSchema = solicitudPostventaResumenSchema.extend({
  motivoGeneral: z.string(),
  observacionesResolucion: z.string().nullable(),
  nombreEmpleadoResuelve: z.string().nullable(),
  metodoReembolso: metodoReembolsoSchema.nullable(),
  referenciaReembolso: z.string().nullable(),
  comprobanteUrl: z.string().nullable(),
  fechaReembolso: fechaHoraSchema.nullable(),
  datosBancarios: datosBancariosInputSchema.nullable(),
  lineas: z.array(lineaPostventaSchema),
  historial: z.array(historialEstadoPostventaSchema),
});
export type SolicitudPostventaDetalle = z.infer<typeof solicitudPostventaDetalleSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 4. CÓDIGOS DE ERROR
 * ─────────────────────────────────────────────────────────────────────────── */

export const CODIGOS_ERROR_M11 = {
  RECURSO_NO_DISPONIBLE: 'RECURSO_NO_DISPONIBLE',
  PARAMETRO_INVALIDO: 'PARAMETRO_INVALIDO',
  ORDEN_NO_ELEGIBLE: 'ORDEN_NO_ELEGIBLE',
  PLAZO_VENCIDO: 'PLAZO_VENCIDO',
  PRODUCTO_ENTONADO_NO_PERMITIDO: 'PRODUCTO_ENTONADO_NO_PERMITIDO',
  SOLICITUD_DUPLICADA: 'SOLICITUD_DUPLICADA',
  TRANSICION_NO_PERMITIDA: 'TRANSICION_NO_PERMITIDA',
  ESTADO_CAMBIADO: 'ESTADO_CAMBIADO',
  MOTIVO_REQUERIDO: 'MOTIVO_REQUERIDO',
  OPERACION_NO_HABILITADA: 'OPERACION_NO_HABILITADA',
  ERROR_INTERNO: 'ERROR_INTERNO',
} as const;

export const codigoErrorM11Schema = z.enum([
  CODIGOS_ERROR_M11.RECURSO_NO_DISPONIBLE,
  CODIGOS_ERROR_M11.PARAMETRO_INVALIDO,
  CODIGOS_ERROR_M11.ORDEN_NO_ELEGIBLE,
  CODIGOS_ERROR_M11.PLAZO_VENCIDO,
  CODIGOS_ERROR_M11.PRODUCTO_ENTONADO_NO_PERMITIDO,
  CODIGOS_ERROR_M11.SOLICITUD_DUPLICADA,
  CODIGOS_ERROR_M11.TRANSICION_NO_PERMITIDA,
  CODIGOS_ERROR_M11.ESTADO_CAMBIADO,
  CODIGOS_ERROR_M11.MOTIVO_REQUERIDO,
  CODIGOS_ERROR_M11.OPERACION_NO_HABILITADA,
  CODIGOS_ERROR_M11.ERROR_INTERNO,
]);
export type CodigoErrorM11 = z.infer<typeof codigoErrorM11Schema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 5. ENVELOPES DE RESPUESTA
 * ─────────────────────────────────────────────────────────────────────────── */

export const errorResponseEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: codigoErrorM11Schema,
    message: z.string(),
    details: z.unknown().nullable(),
  }),
});
export type ErrorResponseEnvelope = z.infer<typeof errorResponseEnvelopeSchema>;

export const paginacionSchema = z.object({
  pagina: z.number().int().positive(),
  limite: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPaginas: z.number().int().nonnegative(),
});
export type Paginacion = z.infer<typeof paginacionSchema>;

export const solicitudPostventaResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: solicitudPostventaDetalleSchema,
});
export type SolicitudPostventaResponseEnvelope = z.infer<
  typeof solicitudPostventaResponseEnvelopeSchema
>;

export const listaPostventaResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.array(solicitudPostventaResumenSchema),
  pagination: paginacionSchema,
});
export type ListaPostventaResponseEnvelope = z.infer<
  typeof listaPostventaResponseEnvelopeSchema
>;

export const resumenGestionPostventaResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.array(
    z.object({
      estado: estadoPostventaSchema,
      cantidad: z.number().int().nonnegative(),
    })
  ),
});
export type ResumenGestionPostventaResponseEnvelope = z.infer<
  typeof resumenGestionPostventaResponseEnvelopeSchema
>;

/* ───────────────────────────────────────────────────────────────────────────
 * 6. ENDPOINTS PREVISTOS (Prefijo /api/v1)
 * ─────────────────────────────────────────────────────────────────────────── */

export const ENDPOINTS_M11 = [
  { metodo: 'GET', ruta: '/postventa/mis-solicitudes', acceso: 'cliente titular', hu: 'HU-POS-03' },
  { metodo: 'GET', ruta: '/postventa/mis-solicitudes/:codigo', acceso: 'cliente titular', hu: 'HU-POS-03' },
  { metodo: 'POST', ruta: '/postventa/cancelar', acceso: 'cliente titular', hu: 'HU-POS-01' },
  { metodo: 'POST', ruta: '/postventa/devolver', acceso: 'cliente titular', hu: 'HU-POS-02' },
  { metodo: 'GET', ruta: '/postventa/gestion', acceso: 'ventas.ver', hu: 'HU-POS-04' },
  { metodo: 'GET', ruta: '/postventa/gestion/resumen', acceso: 'ventas.ver', hu: 'HU-POS-04' },
  { metodo: 'GET', ruta: '/postventa/gestion/:codigo', acceso: 'ventas.ver', hu: 'HU-POS-04' },
  { metodo: 'PATCH', ruta: '/postventa/gestion/:codigo/resolver', acceso: 'ventas.gestionar', hu: 'HU-POS-05' },
  { metodo: 'POST', ruta: '/postventa/gestion/:codigo/reembolso', acceso: 'ventas.gestionar', hu: 'HU-POS-06' },
] as const;
