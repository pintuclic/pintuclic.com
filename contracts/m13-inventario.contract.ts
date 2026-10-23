import { z } from 'zod';

/**
 * ============================================================================
 * CONTRATO DE API REST — M13. Inventario Referencial
 * ============================================================================
 * Scope: m13-inventario · Ola 2
 *
 * Este contrato ES la especificación del módulo y lo que el Tech Lead revisa
 * antes de que se escriba el backend. Todo lo que cambie aquí cambia el módulo.
 *
 * ── Qué hace M13 (v1) ───────────────────────────────────────────────────────
 *  - Lleva la EXISTENCIA REFERENCIAL de cada variante del catálogo, editada a
 *    mano por un administrador o por carga masiva con una plantilla PROPIA de
 *    Pintu Clic. Es un "tomador de notas": informativo, sin SAMIT por ahora.
 *  - Cada cambio queda en un HISTORIAL (quién, cuándo, valor anterior y nuevo,
 *    nota opcional, origen).
 *
 * ── Qué NO hace ─────────────────────────────────────────────────────────────
 *  - No se conecta a SAMIT ni escribe nada hacia él. La integración es futura:
 *    el campo `origen` y `codigoProveedor` dejan el espacio para sumarla sin
 *    tocar el catálogo.
 *  - No bloquea ventas por existencia (cero o insuficiente). Única excepción
 *    vigente: los combos (RF-CAT-13-02 de M01), que M13 NO gestiona.
 *  - No toca precios, promociones ni combos. No exporta pedidos/ventas/clientes.
 *
 * ── Reglas clave ────────────────────────────────────────────────────────────
 *  R1  La existencia es un entero ≥ 0 (CHECK de la BD). Nunca negativa.
 *  R2  Un cambio sin variación (mismo valor) no escribe ni genera historial.
 *  R3  Todo cambio escribe historial en la MISMA transacción que la variante.
 *  R4  La carga masiva es por bloques de hasta 500 filas; cada fila es
 *      independiente: una inválida no impide aplicar las demás.
 *  R5  La carga masiva tiene vista previa (no escribe) y aplicación (escribe).
 *  R6  Las filas con el mismo identificador dentro de un bloque se rechazan.
 *  R7  Una variante ausente de la carga no se toca.
 *  R8  Autorización siempre en servidor; el 403 es el opaco estándar de M17.
 *
 * ── Decisiones tomadas por defecto (el Tech Lead puede vetarlas) ────────────
 *  D1  Permisos: se REUTILIZAN `catalogo.ver` (consultar) y `catalogo.editar`
 *      (ajustar y cargar). No se crean permisos nuevos → no se toca el seed de M17.
 *  D2  Carga masiva por JSON en bloques (el frontend lee el CSV y envía filas).
 *      Evita multipart y mantiene la memoria acotada sin infraestructura nueva.
 *  D3  Sin tabla de "lotes": las filas de una carga comparten un `idCarga`.
 *  D4  La existencia 0 se presenta como "agotado" derivándola al leer; no se
 *      cambia el estado administrativo de la variante.
 *  D5  Auditoría: el historial propio de M13 es el registro durable. No se amplía
 *      `AuditoriaPort` de M20.
 *
 * Regla de Oro #1: Cero código sin contrato previo.
 * Regla de Oro #11: Tolerancia Cero al tipo `any`.
 * ============================================================================
 */

/* ───────────────────────────────────────────────────────────────────────────
 * 1. PRIMITIVAS Y ENUMS
 * ─────────────────────────────────────────────────────────────────────────── */

/** Máximo de un INT de PostgreSQL. */
export const EXISTENCIA_MAXIMA = 2_147_483_647;
/** Tamaño máximo de un bloque de carga masiva (R4). */
export const MAXIMO_FILAS_BLOQUE = 500;

export const idVarianteSchema = z.number().int().positive();
export const existenciaSchema = z.number().int().min(0).max(EXISTENCIA_MAXIMA);
export const notaSchema = z.string().trim().max(500);
/** Código de proveedor (SAMIT). Se normaliza con trim; es único en `variante`. */
export const codigoProveedorSchema = z.string().trim().min(1).max(100);

export const origenAjusteSchema = z.enum(['manual', 'carga_masiva', 'samit']);
export type OrigenAjuste = z.infer<typeof origenAjusteSchema>;

export const estadoExistenciaSchema = z.enum(['disponible', 'agotado']);
export type EstadoExistencia = z.infer<typeof estadoExistenciaSchema>;

/** Resultado de evaluar una fila de la carga masiva. */
export const resultadoFilaSchema = z.enum(['modificada', 'sin_cambios', 'rechazada']);
export type ResultadoFila = z.infer<typeof resultadoFilaSchema>;

export const motivoRechazoSchema = z.enum([
  'identificador_ausente',
  'identificador_duplicado_en_bloque',
  'variante_no_encontrada',
  'existencia_invalida',
]);
export type MotivoRechazo = z.infer<typeof motivoRechazoSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 2. ENTIDADES
 * ─────────────────────────────────────────────────────────────────────────── */

export const itemInventarioSchema = z.object({
  idVariante: idVarianteSchema,
  idProducto: z.number().int().positive(),
  nombreProducto: z.string(),
  presentacion: z.string(),
  codigoProveedor: z.string().nullable(),
  existenciaReferencial: existenciaSchema,
  estadoExistencia: estadoExistenciaSchema,
});
export type ItemInventario = z.infer<typeof itemInventarioSchema>;

export const ajusteInventarioSchema = z.object({
  idAjuste: z.number().int().positive(),
  idVariante: idVarianteSchema,
  existenciaAnterior: existenciaSchema,
  existenciaNueva: existenciaSchema,
  nota: z.string().nullable(),
  origen: origenAjusteSchema,
  idCarga: z.string().uuid().nullable(),
  idUsuario: z.number().int().positive(),
  fecha: z.string().datetime(),
});
export type AjusteInventario = z.infer<typeof ajusteInventarioSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 3. PETICIONES (REQUEST)
 * ─────────────────────────────────────────────────────────────────────────── */

export const paginacionQuerySchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(20),
});

/** GET /admin/inventario/variantes */
export const listarInventarioRequestSchema = paginacionQuerySchema.extend({
  busqueda: z.string().trim().max(100).optional(),
  estadoExistencia: estadoExistenciaSchema.optional(),
});
export type ListarInventarioRequest = z.infer<typeof listarInventarioRequestSchema>;

/** GET /admin/inventario/variantes/:idVariante/historial */
export const listarHistorialRequestSchema = paginacionQuerySchema;
export type ListarHistorialRequest = z.infer<typeof listarHistorialRequestSchema>;

/** PUT /admin/inventario/variantes/:idVariante/existencia */
export const ajustarExistenciaRequestSchema = z.object({
  existencia: existenciaSchema,
  nota: notaSchema.optional(),
});
export type AjustarExistenciaRequest = z.infer<typeof ajustarExistenciaRequestSchema>;

/**
 * Fila de la carga masiva. Se identifica la variante por `idVariante` o por
 * `codigoProveedor` (al menos uno). Si vienen ambos, manda `idVariante`.
 */
export const filaCargaSchema = z.object({
  idVariante: idVarianteSchema.optional(),
  codigoProveedor: codigoProveedorSchema.optional(),
  existencia: z.number(),
  nota: notaSchema.optional(),
});
export type FilaCarga = z.infer<typeof filaCargaSchema>;

/** POST /admin/inventario/cargas/previsualizar — no escribe (R5). */
export const previsualizarCargaRequestSchema = z.object({
  filas: z.array(filaCargaSchema).min(1).max(MAXIMO_FILAS_BLOQUE),
});
export type PrevisualizarCargaRequest = z.infer<typeof previsualizarCargaRequestSchema>;

/**
 * POST /admin/inventario/cargas/aplicar — escribe (R5).
 * `idCarga` agrupa todos los bloques de una misma carga (D3). Reenviar el mismo
 * bloque con el mismo `idCarga` es idempotente: lo ya aplicado queda "sin cambios".
 */
export const aplicarCargaRequestSchema = z.object({
  idCarga: z.string().uuid(),
  filas: z.array(filaCargaSchema).min(1).max(MAXIMO_FILAS_BLOQUE),
});
export type AplicarCargaRequest = z.infer<typeof aplicarCargaRequestSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 4. RESPUESTAS (ENVELOPES CANÓNICOS)
 * ─────────────────────────────────────────────────────────────────────────── */

const paginacionSchema = z.object({
  pagina: z.number().int().positive(),
  limite: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPaginas: z.number().int().nonnegative(),
});

export const listarInventarioResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.array(itemInventarioSchema),
  pagination: paginacionSchema,
});
export type ListarInventarioResponseEnvelope = z.infer<typeof listarInventarioResponseEnvelopeSchema>;

export const listarHistorialResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.array(ajusteInventarioSchema),
  pagination: paginacionSchema,
});
export type ListarHistorialResponseEnvelope = z.infer<typeof listarHistorialResponseEnvelopeSchema>;

/** `ajuste` es null cuando el valor no cambió (R2). */
export const ajustarExistenciaResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.object({
    item: itemInventarioSchema,
    ajuste: ajusteInventarioSchema.nullable(),
  }),
});
export type AjustarExistenciaResponseEnvelope = z.infer<typeof ajustarExistenciaResponseEnvelopeSchema>;

export const resultadoFilaCargaSchema = z.object({
  /** Posición de la fila en el bloque enviado (base 0). */
  indice: z.number().int().nonnegative(),
  resultado: resultadoFilaSchema,
  idVariante: idVarianteSchema.nullable(),
  existenciaAnterior: existenciaSchema.nullable(),
  existenciaNueva: existenciaSchema.nullable(),
  motivoRechazo: motivoRechazoSchema.nullable(),
});
export type ResultadoFilaCarga = z.infer<typeof resultadoFilaCargaSchema>;

export const balanceCargaSchema = z.object({
  total: z.number().int().nonnegative(),
  modificadas: z.number().int().nonnegative(),
  sinCambios: z.number().int().nonnegative(),
  rechazadas: z.number().int().nonnegative(),
});
export type BalanceCarga = z.infer<typeof balanceCargaSchema>;

/** Respuesta de previsualizar (aplicada = false) y de aplicar (aplicada = true). */
export const cargaResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.object({
    aplicada: z.boolean(),
    idCarga: z.string().uuid().nullable(),
    balance: balanceCargaSchema,
    filas: z.array(resultadoFilaCargaSchema),
  }),
});
export type CargaResponseEnvelope = z.infer<typeof cargaResponseEnvelopeSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 5. ERRORES (opacos, HU-SEG-06 / RN-ADM-12)
 * ─────────────────────────────────────────────────────────────────────────── */

export const errorInventarioEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({
    codigo: z.enum(['ACCESO_DENEGADO', 'VALIDACION', 'VARIANTE_NO_ENCONTRADA']),
    mensaje: z.string(),
  }),
});
export type ErrorInventarioEnvelope = z.infer<typeof errorInventarioEnvelopeSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 6. MAPA DE RUTAS (montaje: /api/v1/admin/inventario)
 * ───────────────────────────────────────────────────────────────────────────
 *  GET  /variantes                        catalogo.ver     → listarInventario
 *  GET  /variantes/:idVariante/historial  catalogo.ver     → listarHistorial
 *  PUT  /variantes/:idVariante/existencia catalogo.editar  → ajustarExistencia
 *  POST /cargas/previsualizar             catalogo.editar  → previsualizarCarga
 *  POST /cargas/aplicar                   catalogo.editar  → aplicarCarga
 * ─────────────────────────────────────────────────────────────────────────── */
