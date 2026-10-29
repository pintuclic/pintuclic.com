import { z } from 'zod';

/**
 * ============================================================================
 * CONTRATO DE API REST — M09. Cumplimiento y preparación
 * ============================================================================
 * Scope: m09-cumplimiento · Ola 3 · Carril Venta · APROBADO por el usuario el 2026-10-29
 *
 * Este contrato ES la especificación del módulo. Spec guía:
 * docs/02_MODULOS_FUNCIONALES/M09_ESPECIFICACION_CUMPLIMIENTO.md (HU-CUM-01, 03, 05 y 06).
 *
 * ── Qué es M09 ──────────────────────────────────────────────────────────────
 *  Una mejora de M08 (decisión del PO): hace didáctico el momento en que el empleado revisa si hay
 *  producto y evita cargar la pantalla del pedido con funciones. Es deliberadamente liviano: una lista
 *  de chequeo por línea, el paso automático a preparación y la hoja que se imprime para la bodega.
 *
 * ── Qué incluye ─────────────────────────────────────────────────────────────
 *  Marcar cada línea de una orden como disponible, consiguiendo stock o no disponible (y corregirlo) con su
 *  rastro · paso automático de `revision_disponibilidad` a `en_preparacion` al quedar todas disponibles · lista de órdenes que
 *  siguen retenidas y por qué · hoja de preparación imprimible, sin importes.
 *
 * ── Qué NO incluye ──────────────────────────────────────────────────────────
 *  Contar unidades halladas: el estado de la línea es de la línea entera, sin cantidades (D10) · un trámite
 *  de consecución de existencias (HU-CUM-02 y HU-CUM-04 siguen retiradas): «consiguiendo stock» es solo
 *  una marca de la línea, sin pasos ni seguimiento propios · dividir una orden o
 *  borrar líneas (M08 no lo ofrece y esta regla lo mantiene) · ver nada de esto desde la cuenta del
 *  cliente · modificar la existencia referencial del catálogo (M01) · iniciar y terminar la preparación
 *  con pantallas propias (ya es el cambio de estado de M08) · transporte (M10) · cancelación (M11) ·
 *  correos (M18) · generar el PDF en el servidor.
 *
 * ── Cómo cubre la spec (qué se hizo con cada requisito) ─────────────────────
 *  HU-CUM-01  01-01 → R4 y GET /retenidas · 01-02 → una marca por línea: disponible, consiguiendo stock o no disponible (D2) ·
 *             01-05 → R3 · 01-06 → R6 · 01-07 → R10 · 01-08 → R5 y GET /verificacion ·
 *             01-09 → la línea trae base y color de M08 · 01-12 → la línea de un combo es una sola
 *             línea que se marca como una unidad, sin desglose · 01-10 → R11 · RNF-01-01 → pantalla
 *             pensada para móvil (frontend).
 *  HU-CUM-03  03-01 → R7 · 03-02 → R8 · 03-03 → R12 y GET /retenidas · 03-07 → R9 · 03-10 → R7.
 *  HU-CUM-05  05-01 → historial de M08 (R1) · 05-04 → R7 y las transiciones de M08 · 05-05 → ya está
 *             en M08 (preparada → en_preparacion exige motivo, nunca a revisión).
 *  HU-CUM-06  06-01, 06-02 y 06-03 → R13 y GET /hoja.
 *
 * ── Reglas clave ────────────────────────────────────────────────────────────
 *  R1  M09 solo mueve la orden en un caso: `revision_disponibilidad` → `en_preparacion` (R7). Terminar la
 *      preparación, devolver una orden preparada (con motivo), despachar y entregar siguen siendo de M08.
 *  R2  Cada línea está `pendiente` (nadie la ha revisado), `disponible`, `consiguiendo_stock` (no está completa
 *      en bodega y se está consiguiendo) o `no_disponible`. La marca es de la línea entera: no se cuentan unidades.
 *  R3  Cada marca, y cada corrección, inserta un registro con su estado, autor y momento. Nunca se actualiza ni
 *      se borra: el estado de la línea es el de su último registro. Marcar lo que ya está así no inserta nada.
 *  R4  Solo se verifica una orden en `revision_disponibilidad`, `en_preparacion` o `preparada` (también
 *      rige para la hoja). En otro estado → 409 ORDEN_FUERA_DE_CUMPLIMIENTO.
 *  R5  Es incremental: cada petición guarda lo que envía y lo marcado persiste; no hay «cerrar sesión de
 *      verificación». Una petición puede traer una línea o varias (por ejemplo, «marcar todas»).
 *  R6  Corregir una marca conserva la anterior. Corregir con la orden ya en `en_preparacion` o `preparada`
 *      NO la hace retroceder.
 *  R7  Avance automático: si tras aplicar la petición la orden está en `revision_disponibilidad` y todas
 *      sus líneas están `disponible` (con una `pendiente`, `consiguiendo_stock` o `no_disponible` no avanza), pasa a `en_preparacion` en la MISMA transacción, con historial de M08
 *      (autor = el empleado que confirmó la última línea, motivo fijo) y el mismo evento de cambio de
 *      estado. Si la orden cambió de estado mientras tanto → 409 ESTADO_CAMBIADO y no se guarda nada.
 *  R8  No hay despacho parcial ni forma de eludirlo: mientras una línea no esté disponible la orden no sale de
 *      `revision_disponibilidad`, y M08 no permite dividir la orden ni borrar líneas (R6 de M08).
 *  R9  El momento en que la orden alcanza la disponibilidad completa es el de la fila de historial de M08
 *      que crea R7; no se guarda en otra parte.
 *  R10 M09 nunca escribe sobre la existencia referencial de la variante: son dos datos distintos.
 *  R11 Autorización siempre en servidor y solo sesión de personal. TODAS las operaciones, también los `GET`,
 *      exigen `ventas.gestionar` (el permiso «Gestión de pedidos», RF-CUM-01-10). El administrador no tiene
 *      excepción. Sin permiso, orden inexistente o sesión de cliente → 404 RECURSO_NO_DISPONIBLE idéntico
 *      (ADR-003), y el intento se audita (M20).
 *  R12 Una orden está «retenida» si está en `revision_disponibilidad` y tiene al menos una línea que no está
 *      `disponible`; el motivo es la lista de esas líneas con su estado. La lista va de la más antigua a la más reciente.
 *  R13 La hoja de preparación lleva: código, fecha y estado de la orden AL GENERARLA, y por línea producto,
 *      presentación, color, cantidad y la base que se consume si es entonada. NUNCA importes, descuentos,
 *      datos de pago ni datos del cliente (el esquema es `.strict()` y una prueba lo comprueba).
 *  R14 Nada de M09 se devuelve al cliente. Si falta un producto, el empleado deja la línea en
 *      `consiguiendo_stock` o `no_disponible` y lo resuelve con el cliente por los contactos y notas de M08; la
 *      orden sigue en revisión. Cancelarla es una solicitud de postventa de M11, no de este módulo (D11).
 *
 * ── Decisiones por defecto (el Tech Lead puede vetarlas) ────────────────────
 *  D1  Prefijo de rutas /api/v1/cumplimiento/...
 *  D2  Tres marcas por línea (`disponible`, `consiguiendo_stock`, `no_disponible`) más `pendiente` sin revisar,
 *      en vez de total/parcial/nula con cantidades. El PO pidió un estado intermedio y no solo «hay / no hay»;
 *      si lo prefiere llamar «parcial», solo cambia el texto del enum (ver D10).
 *  D3  El rastro es una tabla nueva de solo inserción, `verificacion_linea_orden` (id_linea_orden,
 *      estado, id_usuario_autor, momento). El estado actual es el último registro por línea.
 *  D4  Las líneas se identifican por `numeroLinea` (posición 1..n por orden de creación). La API no expone
 *      claves primarias y las líneas de una orden no cambian (R6 de M08), así que el número es estable.
 *  D5  Todo el módulo se reserva a `ventas.gestionar`, como pide la spec (RF-CUM-01-10) y a diferencia de M08,
 *      donde consultar usa `ventas.ver`. Un empleado que solo consulta pedidos no ve esta lista ni la hoja.
 *  D6  Los permisos ya están sembrados: sin tocar el seed. Se sigue exigiendo sesión de personal (como M08).
 *  D7  M09 abre/cierra la preparación SIN tabla propia: el inicio es la entrada a `en_preparacion` (R7) y el
 *      fin es el paso a `preparada` de M08; ambos guardan autor y momento en el historial de M08.
 *  D8  La hoja la imprime el navegador (vista de impresión); el servidor solo entrega los datos.
 *  D9  Paginación de retenidas por defecto 20, máximo 100.
 *
 * ── Cambios fuera de la carpeta del módulo (autorizados para M09) ───────────
 *  PR general (archivos compartidos): tabla `verificacion_linea_orden` en bd/sql/schema_pintuclic.sql y
 *    modelo en schema.prisma · notas en los changelogs. Sin permisos nuevos. Montar las rutas en `app.routes.ts`
    viaja con el módulo, no con este PR: importaría un constructor que aún no existe y rompería la compilación.
 *  M08: (1) quitar de `reglas-estado.ts` la transición manual `revision_disponibilidad` → `en_preparacion`
 *    (queda solo R7; el panel «Pasar a» deja de ofrecerla), con sus pruebas, su fila en
 *    TRANSICIONES_ESTADO del contrato de M08 y el §5 de su spec; (2) exportar una función transaccional que
 *    M09 use para R7, como ya hace M11 con `cambiarEstadoPorPostventa`; (3) montar el panel de M09 y el
 *    enlace a la hoja en el detalle del pedido del personal.
 *
 *  D10 `consiguiendo_stock` es «hay parte de las unidades o se espera el resto»: la línea solo pasa a `disponible`
 *      cuando están TODAS. No se registra cuántas unidades hay (decisión del PO el 2026-10-29); si algún día se
 *      quiere, es un campo más en la marca y el resto del diseño no cambia.
 *  D11 Una orden con líneas `no_disponible` que el cliente ya no quiere se cancela por M11 (postventa). M09 no
 *      ofrece atajo para iniciar esa solicitud.
 *  D12 La hoja no dice «combo»: M08 no guarda ese dato y no se añade. Una línea de combo se marca como cualquier otra.
 *  D13 Las órdenes anteriores en `orden_confirmada` no se verifican hasta pasarlas a revisión con M08 (R4).
 *
 * ── Preguntas abiertas ──────────────────────────────────────────────────────
 *  Ninguna.
 *
 * Regla de Oro #1: Cero código sin contrato previo.
 * Regla de Oro #11: Tolerancia Cero al tipo `any`.
 * ============================================================================
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

/** R2. Lo que el empleado puede marcar en una línea. */
export const ESTADOS_MARCA = ['disponible', 'consiguiendo_stock', 'no_disponible'] as const;
export const estadoMarcaSchema = z.enum(ESTADOS_MARCA);
export type EstadoMarca = z.infer<typeof estadoMarcaSchema>;

/** R2. Estado de una línea: su última marca, o `pendiente` si nadie la ha revisado (no se puede marcar a mano). */
export const ESTADOS_LINEA = ['pendiente', ...ESTADOS_MARCA] as const;
export const estadoLineaSchema = z.enum(ESTADOS_LINEA);
export type EstadoLinea = z.infer<typeof estadoLineaSchema>;

/** R7. Texto fijo del historial de M08 cuando la orden avanza sola. */
export const MOTIVO_AVANCE_AUTOMATICO = 'Disponibilidad confirmada en todas las líneas';

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
  /** Es el del último registro de `historial`; `pendiente` si no hay ninguno. */
  estado: estadoLineaSchema,
  /** Del más antiguo al más reciente. Vacío mientras nadie la haya marcado. */
  historial: z.array(registroVerificacionSchema),
});
export type LineaVerificacion = z.infer<typeof lineaVerificacionSchema>;

export const verificacionOrdenSchema = z.object({
  codigo: codigoOrdenSchema,
  estado: estadoCumplimientoSchema,
  /** Líneas que no están `disponible`: pendientes, consiguiendo stock o no disponibles. */
  lineasSinConfirmar: z.number().int().nonnegative(),
  /** true cuando todas las líneas están `disponible`. */
  completa: z.boolean(),
  lineas: z.array(lineaVerificacionSchema),
});
export type VerificacionOrden = z.infer<typeof verificacionOrdenSchema>;

/** R12. Por qué una orden sigue retenida: una línea que no está disponible y en qué estado está. */
export const motivoRetencionSchema = z.object({
  /** Producto y presentación de la línea. */
  descripcion: z.string(),
  estado: estadoLineaSchema.exclude(['disponible']),
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

/* ───────────────────────────────────────────────────────────────────────────
 * 4. ERRORES
 * ─────────────────────────────────────────────────────────────────────────── */

export const CODIGOS_ERROR_M09 = {
  RECURSO_NO_DISPONIBLE: 'RECURSO_NO_DISPONIBLE',
  PARAMETRO_INVALIDO: 'PARAMETRO_INVALIDO',
  ORDEN_FUERA_DE_CUMPLIMIENTO: 'ORDEN_FUERA_DE_CUMPLIMIENTO',
  ESTADO_CAMBIADO: 'ESTADO_CAMBIADO',
  ERROR_INTERNO: 'ERROR_INTERNO',
} as const;
export const codigoErrorM09Schema = z.enum([
  CODIGOS_ERROR_M09.RECURSO_NO_DISPONIBLE,
  CODIGOS_ERROR_M09.PARAMETRO_INVALIDO,
  CODIGOS_ERROR_M09.ORDEN_FUERA_DE_CUMPLIMIENTO,
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
 *  un `numeroLinea` que la orden no tiene: details lo indica) · 409 ORDEN_FUERA_DE_CUMPLIMIENTO (R4),
 *  ESTADO_CAMBIADO (R7) · 500 ERROR_INTERNO.
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

/** GET /cumplimiento/ordenes/:codigo/verificacion */
export const verificacionResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: verificacionOrdenSchema,
});
export type VerificacionResponseEnvelope = z.infer<typeof verificacionResponseEnvelopeSchema>;

/** PUT /cumplimiento/ordenes/:codigo/verificacion. `avanzo: true` = esta petición movió la orden a preparación (R7). */
export const verificarLineasResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.object({ verificacion: verificacionOrdenSchema, avanzo: z.boolean() }),
});
export type VerificarLineasResponseEnvelope = z.infer<typeof verificarLineasResponseEnvelopeSchema>;

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
] as const;
