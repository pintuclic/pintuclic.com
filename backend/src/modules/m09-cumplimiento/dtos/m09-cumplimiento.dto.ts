import { z } from 'zod';

/**
 * Espejo fiel de `contracts/m09-cumplimiento.contract.ts` para ejecución en el backend
 * (el contrato vive fuera de `backend/src`). NO editar aquí: se cambia el contrato y
 * se copia. `m09-cumplimiento.contrato-espejo.test.ts` falla si ambos difieren.
 */

/* ───────────────────────────────────────────────────────────────────────────
 * 1. PRIMITIVAS Y ENUMS
 * ─────────────────────────────────────────────────────────────────────────── */

/** Igual que en M08: se acepta cualquier código existente, también el de órdenes anteriores a `PC-AAAA-NNNNN`. */
export const codigoOrdenSchema = z.string().trim().min(1, 'Indique el código del pedido').max(50, 'Máximo 50 caracteres');
export const fechaHoraSchema = z.string().datetime();
export const numeroLineaSchema = z.number().int().positive().max(1000);

/** Los mismos estados de M08; M09 no define estados propios. */
export const ESTADOS_ORDEN = [
  'orden_confirmada',
  'revision_disponibilidad',
  'en_preparacion',
  'preparada',
  'despachado',
  'entregado',
  'cancelado',
  'devuelto',
] as const;
export const estadoOrdenSchema = z.enum(ESTADOS_ORDEN);
export type EstadoOrden = z.infer<typeof estadoOrdenSchema>;

/** R4. Estados en los que se verifica y se genera la hoja. */
export const ESTADOS_CUMPLIMIENTO = ['revision_disponibilidad', 'en_preparacion', 'preparada'] as const;
export const estadoCumplimientoSchema = z.enum(ESTADOS_CUMPLIMIENTO);
export type EstadoCumplimiento = z.infer<typeof estadoCumplimientoSchema>;

/** R2. Lo que el empleado puede marcar en una línea. `preparada` solo con la orden en preparación (R15). */
export const ESTADOS_MARCA = ['disponible', 'consiguiendo_stock', 'no_disponible', 'preparada'] as const;
export const estadoMarcaSchema = z.enum(ESTADOS_MARCA);
export type EstadoMarca = z.infer<typeof estadoMarcaSchema>;

/** R17. Lo que la línea hereda de la orden cuando sale de la preparación; nunca se marca. */
export const ESTADOS_LINEA_HEREDADOS = ['despachada', 'entregada', 'cancelada', 'devuelta'] as const;

/**
 * R17. Estado de una línea: su última marca, o `pendiente` si nadie la ha revisado (no se puede marcar a mano), o el
 * heredado de la orden. Se calcula al leer. Es la misma lista que `ESTADOS_LINEA` del contrato de M08.
 */
export const ESTADOS_LINEA = ['pendiente', ...ESTADOS_MARCA, ...ESTADOS_LINEA_HEREDADOS] as const;
export const estadoLineaSchema = z.enum(ESTADOS_LINEA);
export type EstadoLinea = z.infer<typeof estadoLineaSchema>;

/** R7. Texto fijo del historial de M08 cuando la orden avanza sola a preparación. */
export const MOTIVO_AVANCE_AUTOMATICO = 'Disponibilidad confirmada en todas las líneas';

/** R15. Texto fijo del historial de M08 cuando la orden avanza sola a preparada. */
export const MOTIVO_AVANCE_PREPARADA = 'Preparación completa en todas las líneas';

/** Tope de líneas que una petición puede traer. */
export const MAX_LINEAS_POR_PETICION = 200;

/* ───────────────────────────────────────────────────────────────────────────
 * 2. ENTIDADES DE SALIDA
 * ─────────────────────────────────────────────────────────────────────────── */

/** R3. Un registro del rastro de una línea. */
export const registroVerificacionSchema = z.object({
  estado: estadoMarcaSchema,
  autor: z.string().describe('Nombre del empleado que hizo la marca'),
  fecha: fechaHoraSchema,
});
export type RegistroVerificacion = z.infer<typeof registroVerificacionSchema>;

export const lineaVerificacionSchema = z.object({
  numeroLinea: numeroLineaSchema,
  nombreProducto: z.string(),
  varianteCopia: z.string(),
  colorSolicitado: z.string().nullable(),
  cantidad: z.number().int().positive(),
  esEntonado: z.boolean(),
  /** Base que se consume cuando la línea es entonada; null en cualquier otro caso. */
  baseConsumida: z.string().nullable(),
  /** R17. El del último registro de `historial`; sin registros, el que corresponde al estado de la orden. */
  estado: estadoLineaSchema,
  /** Del más antiguo al más reciente. Vacío mientras nadie la haya marcado. */
  historial: z.array(registroVerificacionSchema),
});
export type LineaVerificacion = z.infer<typeof lineaVerificacionSchema>;

/** R18. Una solicitud de cancelación en trámite sobre la orden (de M11). */
export const tramiteCancelacionSchema = z.object({
  /** Código de la solicitud en M11, `DEV-AAAA-NNNNN`. */
  codigo: z.string().regex(/^DEV-\d{4}-\d{5}$/),
  estado: z.enum(['solicitada', 'en_revision']),
  iniciadaPor: z.enum(['cliente', 'tienda']),
  fecha: fechaHoraSchema,
});
export type TramiteCancelacion = z.infer<typeof tramiteCancelacionSchema>;

export const verificacionOrdenSchema = z.object({
  codigo: codigoOrdenSchema,
  /** R4. La verificación se consulta en cualquier estado de la orden; solo se marca en `ESTADOS_CUMPLIMIENTO`. */
  estado: estadoOrdenSchema,
  /** Líneas pendientes, consiguiendo stock o no disponibles. Las `disponible`, `preparada` y heredadas no cuentan. */
  lineasSinConfirmar: z.number().int().nonnegative(),
  /** true cuando `lineasSinConfirmar` es 0. */
  completa: z.boolean(),
  lineas: z.array(lineaVerificacionSchema),
  /** R18. La solicitud de cancelación en trámite, o null si no hay ninguna. */
  cancelacion: tramiteCancelacionSchema.nullable(),
});
export type VerificacionOrden = z.infer<typeof verificacionOrdenSchema>;

/** R12. Por qué una orden sigue retenida: una línea que no está disponible y en qué estado está. */
export const motivoRetencionSchema = z.object({
  /** Producto y presentación de la línea. */
  descripcion: z.string(),
  estado: z.enum(['pendiente', 'consiguiendo_stock', 'no_disponible']),
});
export type MotivoRetencion = z.infer<typeof motivoRetencionSchema>;

/** R12. Una orden retenida en la revisión de disponibilidad. */
export const ordenRetenidaSchema = z.object({
  codigo: codigoOrdenSchema,
  cliente: z.string(),
  fecha: fechaHoraSchema,
  segundosEnEstado: z.number().int().nonnegative(),
  lineasSinConfirmar: z.number().int().positive(),
  lineasTotales: z.number().int().positive(),
  /** Una entrada por cada línea que no está `disponible`. */
  motivos: z.array(motivoRetencionSchema),
});
export type OrdenRetenida = z.infer<typeof ordenRetenidaSchema>;

export const paginacionSchema = z.object({
  pagina: z.number().int().positive(),
  limite: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPaginas: z.number().int().nonnegative(),
});
export type Paginacion = z.infer<typeof paginacionSchema>;

/**
 * R13. `.strict()` a propósito: la hoja no admite ningún campo más. Añadir un importe, un descuento o un dato de
 * pago aquí debe fallar en las pruebas, no pasar sin que nadie lo note.
 */
export const lineaHojaSchema = z
  .object({
    numeroLinea: numeroLineaSchema,
    nombreProducto: z.string(),
    varianteCopia: z.string(),
    colorSolicitado: z.string().nullable(),
    cantidad: z.number().int().positive(),
    baseConsumida: z.string().nullable().describe('Solo cuando la línea es entonada'),
  })
  .strict();
export type LineaHoja = z.infer<typeof lineaHojaSchema>;

export const hojaPreparacionSchema = z
  .object({
    codigo: codigoOrdenSchema,
    /** Momento en que se generó la hoja (R13): una hoja impresa horas antes no se confunde con el estado actual. */
    generadaEn: fechaHoraSchema,
    /** Estado de la orden en ese momento. */
    estado: estadoCumplimientoSchema,
    lineas: z.array(lineaHojaSchema),
  })
  .strict();
export type HojaPreparacion = z.infer<typeof hojaPreparacionSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 3. PETICIONES (query, params y body)
 * ─────────────────────────────────────────────────────────────────────────── */

export const codigoOrdenParamsSchema = z.object({ codigo: codigoOrdenSchema });

export const paginacionQuerySchema = z.object({
  pagina: z.coerce.number().int().min(1).max(100_000).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(20),
});

/** GET /cumplimiento/retenidas (HU-CUM-03). */
export const listarRetenidasRequestSchema = paginacionQuerySchema;
export type ListarRetenidasRequest = z.infer<typeof listarRetenidasRequestSchema>;

/** Una línea y la marca que recibe (R2, R5). Volver a `pendiente` no se puede: se corrige poniendo otra marca. */
export const lineaVerificadaInputSchema = z.object({
  numeroLinea: numeroLineaSchema,
  estado: estadoMarcaSchema,
});
export type LineaVerificadaInput = z.infer<typeof lineaVerificadaInputSchema>;

/** PUT /cumplimiento/ordenes/:codigo/verificacion (HU-CUM-01). Una línea o varias a la vez (R5). */
export const verificarLineasRequestSchema = z
  .object({
    lineas: z
      .array(lineaVerificadaInputSchema)
      .min(1, 'Indique al menos una línea')
      .max(MAX_LINEAS_POR_PETICION, `Máximo ${MAX_LINEAS_POR_PETICION} líneas por petición`),
  })
  .refine((v) => new Set(v.lineas.map((l) => l.numeroLinea)).size === v.lineas.length, {
    message: 'Una línea no puede repetirse en la misma petición',
    path: ['lineas'],
  });
export type VerificarLineasRequest = z.infer<typeof verificarLineasRequestSchema>;

/** R18. Nota que el empleado añade al motivo; el cliente la lee en el correo (D19). */
export const MAX_NOTA_CANCELACION = 300;

/** POST /cumplimiento/ordenes/:codigo/cancelacion (RF-CUM-03-11). */
export const solicitarCancelacionRequestSchema = z.object({
  nota: z.string().trim().min(1, 'La nota no puede estar vacía').max(MAX_NOTA_CANCELACION, `Máximo ${MAX_NOTA_CANCELACION} caracteres`).optional(),
});
export type SolicitarCancelacionRequest = z.infer<typeof solicitarCancelacionRequestSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 4. ERRORES
 * ─────────────────────────────────────────────────────────────────────────── */

export const CODIGOS_ERROR_M09 = {
  RECURSO_NO_DISPONIBLE: 'RECURSO_NO_DISPONIBLE',
  PARAMETRO_INVALIDO: 'PARAMETRO_INVALIDO',
  ORDEN_FUERA_DE_CUMPLIMIENTO: 'ORDEN_FUERA_DE_CUMPLIMIENTO',
  MARCA_NO_PERMITIDA: 'MARCA_NO_PERMITIDA',
  ORDEN_NO_CANCELABLE: 'ORDEN_NO_CANCELABLE',
  SIN_LINEAS_NO_DISPONIBLES: 'SIN_LINEAS_NO_DISPONIBLES',
  SOLICITUD_DUPLICADA: 'SOLICITUD_DUPLICADA',
  ESTADO_CAMBIADO: 'ESTADO_CAMBIADO',
  ERROR_INTERNO: 'ERROR_INTERNO',
} as const;
export const codigoErrorM09Schema = z.enum([
  CODIGOS_ERROR_M09.RECURSO_NO_DISPONIBLE,
  CODIGOS_ERROR_M09.PARAMETRO_INVALIDO,
  CODIGOS_ERROR_M09.ORDEN_FUERA_DE_CUMPLIMIENTO,
  CODIGOS_ERROR_M09.MARCA_NO_PERMITIDA,
  CODIGOS_ERROR_M09.ORDEN_NO_CANCELABLE,
  CODIGOS_ERROR_M09.SIN_LINEAS_NO_DISPONIBLES,
  CODIGOS_ERROR_M09.SOLICITUD_DUPLICADA,
  CODIGOS_ERROR_M09.ESTADO_CAMBIADO,
  CODIGOS_ERROR_M09.ERROR_INTERNO,
]);

export const errorResponseEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: codigoErrorM09Schema,
    message: z.string(),
    details: z.unknown().nullable(),
  }),
});
export type ErrorResponseEnvelope = z.infer<typeof errorResponseEnvelopeSchema>;

/**
 * Códigos HTTP por error:
 *  404 RECURSO_NO_DISPONIBLE (inexistente, sin permiso o sesión de cliente) · 400 PARAMETRO_INVALIDO (también
 *  un `numeroLinea` que la orden no tiene: details lo indica) · 409 ORDEN_FUERA_DE_CUMPLIMIENTO (R4: marcar o pedir
 *  la hoja fuera de revisión, preparación o preparada), MARCA_NO_PERMITIDA (R15: `preparada` en revisión;
 *  details lista las líneas), ORDEN_NO_CANCELABLE, SIN_LINEAS_NO_DISPONIBLES, SOLICITUD_DUPLICADA (R18),
 *  ESTADO_CAMBIADO (R7, R15) · 500 ERROR_INTERNO.
 */

/* ───────────────────────────────────────────────────────────────────────────
 * 5. RESPUESTAS (envelopes)
 * ─────────────────────────────────────────────────────────────────────────── */

/** GET /cumplimiento/retenidas */
export const retenidasResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.array(ordenRetenidaSchema),
  pagination: paginacionSchema,
});
export type RetenidasResponseEnvelope = z.infer<typeof retenidasResponseEnvelopeSchema>;

/** GET /cumplimiento/ordenes/:codigo/verificacion. Responde en cualquier estado de la orden (R4). */
export const verificacionResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: verificacionOrdenSchema,
});
export type VerificacionResponseEnvelope = z.infer<typeof verificacionResponseEnvelopeSchema>;

/** PUT /cumplimiento/ordenes/:codigo/verificacion. `avanzo: true` = esta petición movió la orden: a preparación (R7) o a preparada (R15). */
export const verificarLineasResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.object({ verificacion: verificacionOrdenSchema, avanzo: z.boolean() }),
});
export type VerificarLineasResponseEnvelope = z.infer<typeof verificarLineasResponseEnvelopeSchema>;

/** POST /cumplimiento/ordenes/:codigo/cancelacion. Devuelve la solicitud creada en M11 (R18). */
export const solicitarCancelacionResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.object({ cancelacion: tramiteCancelacionSchema }),
});
export type SolicitarCancelacionResponseEnvelope = z.infer<typeof solicitarCancelacionResponseEnvelopeSchema>;

/** GET /cumplimiento/ordenes/:codigo/hoja */
export const hojaResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: hojaPreparacionSchema,
});
export type HojaResponseEnvelope = z.infer<typeof hojaResponseEnvelopeSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 6. ENDPOINTS (referencia; prefijo /api/v1)
 * ─────────────────────────────────────────────────────────────────────────── */

export const ENDPOINTS_M09 = [
  { metodo: 'GET', ruta: '/cumplimiento/retenidas', acceso: 'ventas.gestionar', hu: 'HU-CUM-03' },
  { metodo: 'GET', ruta: '/cumplimiento/ordenes/:codigo/verificacion', acceso: 'ventas.gestionar', hu: 'HU-CUM-01' },
  { metodo: 'PUT', ruta: '/cumplimiento/ordenes/:codigo/verificacion', acceso: 'ventas.gestionar', hu: 'HU-CUM-01, 03' },
  { metodo: 'GET', ruta: '/cumplimiento/ordenes/:codigo/hoja', acceso: 'ventas.gestionar', hu: 'HU-CUM-06' },
  { metodo: 'POST', ruta: '/cumplimiento/ordenes/:codigo/cancelacion', acceso: 'ventas.gestionar', hu: 'HU-CUM-03' },
] as const;
