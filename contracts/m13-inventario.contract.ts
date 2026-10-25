import { z } from 'zod';

/**
 * ============================================================================
 * CONTRATO DE API REST — M13. Inventario referencial
 * ============================================================================
 * Scope: m13-inventario · Ola 2 · Base de datos: esquema 4.5 + tabla `ajuste_inventario`
 * Depende de M01 (variantes). Lo consumen M05 (mostrar disponibilidad) y M09 (faltantes).
 *
 * Este contrato ES la especificación del módulo y lo que el Tech Lead revisa antes de
 * que se escriba el código. Lo que cambie aquí cambia el módulo.
 *
 * ── Qué es M13 ──────────────────────────────────────────────────────────────
 *  Un "tomador de notas tecnológico": lleva la EXISTENCIA REFERENCIAL de cada variante
 *  del catálogo (`variante.existencia_referencial`). La edita un administrador a mano
 *  o por carga masiva con una plantilla propia de Pintu Clic. Es informativa: no
 *  bloquea ventas. Cada cambio queda en un historial (quién, cuándo, antes y después).
 *
 * ── Qué NO hace ─────────────────────────────────────────────────────────────
 *  · No se conecta a SAMIT (ni lee ni escribe). La importación desde SAMIT será un
 *    módulo aparte y futuro; el `origen` 'samit' del historial queda reservado.
 *  · No bloquea ventas por existencia (cero o insuficiente). La única excepción es la
 *    de los combos de M01, que M13 NO gestiona.
 *  · No toca precios, promociones, combos ni el resto de la variante. Solo escribe
 *    `existencia_referencial` y su historial.
 *  · No exporta pedidos, ventas ni clientes (son de M08, M04 y M19).
 *
 * ── Reglas ──────────────────────────────────────────────────────────────────
 *  R1  La existencia es un entero entre 0 y 2 147 483 647. Nunca negativa.
 *  R2  Un cambio al mismo valor no escribe ni deja historial ("sin cambios").
 *  R3  El cambio de existencia y su historial se guardan en la MISMA transacción.
 *  R4  Un ajuste manual puede llevar `existenciaEsperada`: el valor que el
 *      administrador veía. Si otra persona la cambió mientras tanto, responde 409
 *      CONFLICTO_EXISTENCIA con la existencia actual y no escribe nada.
 *  R5  La carga masiva identifica cada variante por SKU o, si el cliente no lo
 *      conoce, por marca + producto + medida (tal como están en el catálogo). No
 *      exige ids internos ni códigos de proveedor. Las comparaciones ignoran
 *      mayúsculas, tildes y espacios sobrantes. Si vienen ambos, manda el SKU.
 *  R6  La plantilla de carga se descarga ya llenada con TODAS las variantes y su
 *      existencia actual: el cliente solo cambia los números.
 *  R7  La carga va en bloques de hasta 500 filas. Cada fila se evalúa por separado:
 *      una inválida no impide aplicar las demás. Cada bloque se aplica completo
 *      (en una transacción) o no se aplica.
 *  R8  La carga tiene vista previa (no escribe) y aplicación (escribe). La
 *      aplicación es idempotente: repetir el mismo bloque deja las filas "sin cambios".
 *  R9  Una variante que no aparece en la carga no se toca. Una fila sin existencia
 *      (celda vacía) tampoco: el cliente la omite.
 *  R10 La misma variante dos veces en un bloque se rechaza en todas sus filas
 *      (ambigua). Si el archivo es de varios bloques, quien lo envía (el frontend)
 *      detecta las repeticiones entre bloques antes de enviarlos.
 *  R11 Las variantes inactivas se pueden ajustar: el inventario es una nota, no una
 *      decisión comercial. Se listan solo con `incluirInactivas`.
 *  R12 "Agotado" no es un estado que se guarde: se deriva al leer (existencia = 0).
 *      El estado administrativo de la variante (M01) no cambia.
 *  R13 Autorización siempre en servidor, también en los GET. Toda denegación (sin
 *      sesión o sin permiso) responde 404 RECURSO_NO_DISPONIBLE, sin revelar nada.
 *  R14 El historial es inmutable: no se edita ni se borra.
 *
 * ── Pantallas (administración, `/admin/inventario`) ─────────────────────────
 *  Existencias (lista con filtros y ajuste de una variante) · Carga masiva
 *  (descargar plantilla, subir archivo, vista previa, aplicar) · Historial. Cada
 *  fila de existencias ofrece "Ver historial", que abre el historial ya filtrado.
 *
 * ── Autorización ────────────────────────────────────────────────────────────
 *  GET → catalogo.ver · PUT y POST (ajustar, cargar) → catalogo.editar.
 *
 * ── Decisiones por defecto (el Tech Lead puede vetarlas) ────────────────────
 *  D1  Se reutilizan los permisos `catalogo.ver` y `catalogo.editar` del seed: no se
 *      crean permisos nuevos y no se toca M17.
 *  D2  La carga se envía en JSON por bloques; el frontend lee el CSV. Las dos rutas
 *      de carga necesitan un límite de cuerpo de 1 MB (el general es 100 kb): cambio
 *      de `core/` en un PR aparte, como el de las imágenes de M01.
 *  D3  Los ajustes de una misma carga comparten un `idCarga` (uuid que genera el
 *      frontend). No hay tabla de lotes.
 *  D4  La plantilla es un CSV con `;` y BOM UTF-8 (abre bien en Excel en español).
 *      Se limita a 20 000 variantes; más allá responde 409 y se descarga por marca.
 *      Las celdas que empiezan por `=`, `+`, `-` o `@` se prefijan con `'` para que
 *      una hoja de cálculo no las ejecute como fórmula.
 *  D5  El historial guarda el nombre del usuario que ajustó tal como está hoy en
 *      `usuario`; si el usuario ya no existe, se muestra "Usuario eliminado".
 *  D6  `motivo` del ajuste manual: conteo_fisico, ingreso_mercancia, salida, correccion,
 *      otro (por defecto correccion). En la carga masiva el motivo es siempre
 *      `carga_masiva`. Sirve para entender el historial, no cambia el cálculo.
 *  D7  M01 hoy deja escribir `existenciaReferencial` al crear y editar una variante. Con
 *      M13 eso saltaría el historial. PROPUESTA (requiere tocar M01, que es otro
 *      módulo, y por eso se pregunta al Tech Lead): en un PR aparte, M01 deja de
 *      aceptar la existencia en esas dos operaciones (las variantes nacen en 0) y M13
 *      es el único que la escribe.
 *
 * Regla de Oro #1: Cero código sin contrato previo.
 * Regla de Oro #11: Tolerancia Cero al tipo `any`.
 * ============================================================================
 */

/* ───────────────────────────────────────────────────────────────────────────
 * 1. PRIMITIVAS
 * ─────────────────────────────────────────────────────────────────────────── */

export const EXISTENCIA_MAXIMA = 2_147_483_647;
export const MAXIMO_FILAS_BLOQUE = 500;
export const MAXIMO_FILAS_PLANTILLA = 20_000;

export const idSchema = z.number().int().positive();
export const existenciaSchema = z.number().int().min(0).max(EXISTENCIA_MAXIMA);
export const notaSchema = z.string().trim().min(1).max(500);

export const estadoExistenciaSchema = z.enum(['disponible', 'agotado']);
export type EstadoExistencia = z.infer<typeof estadoExistenciaSchema>;

export const estadoVarianteSchema = z.enum(['activo', 'inactivo']);

export const origenAjusteSchema = z.enum(['manual', 'carga_masiva', 'samit']);
export type OrigenAjuste = z.infer<typeof origenAjusteSchema>;

export const motivoAjusteSchema = z.enum(['conteo_fisico', 'ingreso_mercancia', 'salida', 'correccion', 'otro', 'carga_masiva']);
export type MotivoAjuste = z.infer<typeof motivoAjusteSchema>;

/** Motivos que se pueden elegir a mano (D6). */
export const motivoManualSchema = z.enum(['conteo_fisico', 'ingreso_mercancia', 'salida', 'correccion', 'otro']);

/** Booleano en query string ("true"/"false"): z.coerce.boolean() trataría "false" como true. */
const booleanoQuerySchema = z.enum(['true', 'false']).transform((v) => v === 'true');

export const paginacionQuerySchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(20),
});

/* ───────────────────────────────────────────────────────────────────────────
 * 2. ENTIDADES
 * ─────────────────────────────────────────────────────────────────────────── */

export const itemInventarioSchema = z.object({
  idVariante: idSchema,
  idProducto: idSchema,
  marca: z.string(),
  producto: z.string(),
  /** Nombre de la medida: "1/4 de galón". */
  medida: z.string(),
  sku: z.string(),
  existenciaReferencial: existenciaSchema,
  /** R12: derivada. */
  estadoExistencia: estadoExistenciaSchema,
  estadoVariante: estadoVarianteSchema,
  /** Fecha del último ajuste; null si nunca se ha ajustado. */
  ultimoAjuste: z.string().datetime().nullable(),
});
export type ItemInventario = z.infer<typeof itemInventarioSchema>;

export const ajusteInventarioSchema = z.object({
  idAjuste: idSchema,
  idVariante: idSchema,
  marca: z.string(),
  producto: z.string(),
  medida: z.string(),
  sku: z.string(),
  existenciaAnterior: existenciaSchema,
  existenciaNueva: existenciaSchema,
  motivo: motivoAjusteSchema,
  nota: z.string().nullable(),
  origen: origenAjusteSchema,
  idCarga: z.string().uuid().nullable(),
  idUsuario: idSchema.nullable(),
  /** D5. */
  usuario: z.string(),
  fecha: z.string().datetime(),
});
export type AjusteInventario = z.infer<typeof ajusteInventarioSchema>;

export const resumenInventarioSchema = z.object({
  totalVariantes: z.number().int().nonnegative(),
  disponibles: z.number().int().nonnegative(),
  agotadas: z.number().int().nonnegative(),
  /** Variantes que nunca han tenido un ajuste. */
  sinAjustes: z.number().int().nonnegative(),
  ultimoAjuste: z.string().datetime().nullable(),
});
export type ResumenInventario = z.infer<typeof resumenInventarioSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 3. PETICIONES
 * ─────────────────────────────────────────────────────────────────────────── */

/** GET /variantes — solo variantes activas salvo `incluirInactivas` (R11). */
export const listarInventarioRequestSchema = paginacionQuerySchema.extend({
  /** Producto, marca, medida o SKU. */
  busqueda: z.string().trim().max(100).optional(),
  idMarca: z.coerce.number().int().positive().optional(),
  estadoExistencia: estadoExistenciaSchema.optional(),
  incluirInactivas: booleanoQuerySchema.optional(),
});
export type ListarInventarioRequest = z.infer<typeof listarInventarioRequestSchema>;

/** GET /historial */
export const listarHistorialRequestSchema = paginacionQuerySchema.extend({
  idVariante: z.coerce.number().int().positive().optional(),
  origen: origenAjusteSchema.optional(),
  idCarga: z.string().uuid().optional(),
});
export type ListarHistorialRequest = z.infer<typeof listarHistorialRequestSchema>;

/** PUT /variantes/:idVariante/existencia (R2, R4) */
export const ajustarExistenciaRequestSchema = z.object({
  existencia: existenciaSchema,
  /** La existencia que se veía al empezar; si ya cambió, 409 (R4). */
  existenciaEsperada: existenciaSchema.optional(),
  motivo: motivoManualSchema.default('correccion'),
  nota: notaSchema.optional(),
});
export type AjustarExistenciaRequest = z.infer<typeof ajustarExistenciaRequestSchema>;

/** GET /plantilla */
export const plantillaRequestSchema = z.object({
  idMarca: z.coerce.number().int().positive().optional(),
  incluirInactivas: booleanoQuerySchema.optional(),
});
export type PlantillaRequest = z.infer<typeof plantillaRequestSchema>;

/**
 * Fila de la carga (R5). Se identifica por `sku` o por marca + producto + medida.
 * `existencia` llega como número cualquiera para que la API explique el rechazo
 * ("existencia_invalida") en vez de fallar todo el bloque.
 */
export const filaCargaSchema = z.object({
  sku: z.string().trim().min(1).max(60).optional(),
  marca: z.string().trim().min(1).max(100).optional(),
  producto: z.string().trim().min(1).max(150).optional(),
  medida: z.string().trim().min(1).max(60).optional(),
  existencia: z.number(),
  nota: notaSchema.optional(),
});
export type FilaCarga = z.infer<typeof filaCargaSchema>;

/** POST /cargas/previsualizar — no escribe (R8). */
export const previsualizarCargaRequestSchema = z.object({
  filas: z.array(filaCargaSchema).min(1).max(MAXIMO_FILAS_BLOQUE),
});
export type PrevisualizarCargaRequest = z.infer<typeof previsualizarCargaRequestSchema>;

/**
 * POST /cargas/aplicar — escribe (R7, R8). `idCarga` agrupa los bloques de una misma
 * carga (D3); lo genera el frontend una vez por archivo.
 */
export const aplicarCargaRequestSchema = z.object({
  idCarga: z.string().uuid(),
  filas: z.array(filaCargaSchema).min(1).max(MAXIMO_FILAS_BLOQUE),
});
export type AplicarCargaRequest = z.infer<typeof aplicarCargaRequestSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 4. RESPUESTAS
 * ─────────────────────────────────────────────────────────────────────────── */

export const paginacionSchema = z.object({
  pagina: z.number().int().positive(),
  limite: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPaginas: z.number().int().nonnegative(),
});
export type Paginacion = z.infer<typeof paginacionSchema>;

export const respuestaUno = <T extends z.ZodType>(item: T) => z.object({ success: z.literal(true), data: item });
export const respuestaPaginada = <T extends z.ZodType>(item: T) =>
  z.object({ success: z.literal(true), data: z.array(item), pagination: paginacionSchema });

export const resumenResponseEnvelopeSchema = respuestaUno(resumenInventarioSchema);
export type ResumenResponseEnvelope = z.infer<typeof resumenResponseEnvelopeSchema>;

export const itemResponseEnvelopeSchema = respuestaUno(itemInventarioSchema);
export type ItemResponseEnvelope = z.infer<typeof itemResponseEnvelopeSchema>;

export const listarInventarioResponseEnvelopeSchema = respuestaPaginada(itemInventarioSchema);
export type ListarInventarioResponseEnvelope = z.infer<typeof listarInventarioResponseEnvelopeSchema>;

export const listarHistorialResponseEnvelopeSchema = respuestaPaginada(ajusteInventarioSchema);
export type ListarHistorialResponseEnvelope = z.infer<typeof listarHistorialResponseEnvelopeSchema>;

/** `ajuste` es null cuando el valor no cambió (R2). */
export const ajustarExistenciaResponseEnvelopeSchema = respuestaUno(
  z.object({ item: itemInventarioSchema, ajuste: ajusteInventarioSchema.nullable() }),
);
export type AjustarExistenciaResponseEnvelope = z.infer<typeof ajustarExistenciaResponseEnvelopeSchema>;

export const resultadoFilaSchema = z.enum(['modificada', 'sin_cambios', 'rechazada']);
export type ResultadoFila = z.infer<typeof resultadoFilaSchema>;

export const motivoRechazoSchema = z.enum([
  'identificador_ausente',
  'variante_no_encontrada',
  'variante_repetida_en_bloque',
  'existencia_invalida',
]);
export type MotivoRechazo = z.infer<typeof motivoRechazoSchema>;

export const resultadoFilaCargaSchema = z.object({
  /** Posición de la fila en el bloque enviado (base 0). */
  indice: z.number().int().nonnegative(),
  resultado: resultadoFilaSchema,
  idVariante: idSchema.nullable(),
  /** "Producto · medida", para mostrarla en la vista previa. */
  variante: z.string().nullable(),
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

/** Previsualizar (aplicada = false, idCarga = null) y aplicar (aplicada = true). */
export const cargaResponseEnvelopeSchema = respuestaUno(
  z.object({
    aplicada: z.boolean(),
    idCarga: z.string().uuid().nullable(),
    balance: balanceCargaSchema,
    filas: z.array(resultadoFilaCargaSchema),
  }),
);
export type CargaResponseEnvelope = z.infer<typeof cargaResponseEnvelopeSchema>;

/** Columnas de la plantilla, en orden (D4). Las dos últimas son las únicas que se llenan. */
export const COLUMNAS_PLANTILLA = ['marca', 'producto', 'medida', 'sku', 'existencia_actual', 'existencia'] as const;

/* ───────────────────────────────────────────────────────────────────────────
 * 5. ERRORES
 * ───────────────────────────────────────────────────────────────────────────
 * Mismo envelope global que M01. Estados HTTP: 400 PARAMETRO_INVALIDO ·
 * 404 RECURSO_NO_DISPONIBLE (también toda denegación, R13) · 409 CONFLICTO_EXISTENCIA
 * (R4) y PLANTILLA_DEMASIADO_GRANDE (D4).
 */
export const CODIGOS_ERROR_INVENTARIO = [
  'PARAMETRO_INVALIDO',
  'RECURSO_NO_DISPONIBLE',
  'CONFLICTO_EXISTENCIA',
  'PLANTILLA_DEMASIADO_GRANDE',
] as const;

export const errorInventarioEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.enum(CODIGOS_ERROR_INVENTARIO),
    message: z.string(),
    /** CONFLICTO_EXISTENCIA → la existencia actual; el resto → null. */
    details: z.object({ existenciaActual: existenciaSchema }).nullable(),
  }),
});
export type ErrorInventarioEnvelope = z.infer<typeof errorInventarioEnvelopeSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 6. MAPA DE RUTAS (montaje: /api/v1/admin/inventario)
 * ───────────────────────────────────────────────────────────────────────────
 *  GET  /resumen                              catalogo.ver     → resumen
 *  GET  /variantes                            catalogo.ver     → listarInventario (paginado)
 *  GET  /variantes/:idVariante                catalogo.ver     → una variante
 *  PUT  /variantes/:idVariante/existencia     catalogo.editar  → ajustarExistencia
 *  GET  /historial                            catalogo.ver     → listarHistorial (paginado)
 *  GET  /plantilla                            catalogo.ver     → CSV descargable (text/csv)
 *  POST /cargas/previsualizar                 catalogo.editar  → no escribe
 *  POST /cargas/aplicar                       catalogo.editar  → escribe
 * ─────────────────────────────────────────────────────────────────────────── */
