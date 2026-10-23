import { z } from 'zod';

/**
 * ============================================================================
 * CONTRATO DE API REST — M01. Catálogo de Productos · ENTREGA 1: CATÁLOGOS BASE
 * ============================================================================
 * Scope: m01-catalogo · Ola 2
 *
 * Este contrato ES la especificación de la entrega y lo que el Tech Lead revisa
 * antes de que se escriba el backend. Todo lo que cambie aquí cambia el módulo.
 * Reglas adicionales y decisiones heredadas del DDL: docs/02_MODULOS_FUNCIONALES/
 * M01_REGLAS_ADICIONALES.md. Spec base: M01_ESPECIFICACION_CATALOGO.md.
 *
 * ── Entrega 1 (este contrato) ───────────────────────────────────────────────
 *  HU-CAT-01 categorías y subcategorías · HU-CAT-04 marcas · HU-CAT-11 líneas
 *  HU-CAT-12 bases (solo su administración) · tipos de resina · presentaciones.
 *
 * ── Fuera de esta entrega ───────────────────────────────────────────────────
 *  Colores (HU-CAT-05), productos (HU-CAT-02), atributos técnicos (HU-CAT-10),
 *  variantes con precio y existencia (HU-CAT-03), combos (HU-CAT-13), consulta
 *  pública (HU-CAT-06), imágenes (HU-CAT-07), complementarios (HU-CAT-08).
 *  Asociaciones base↔producto y color↔base llegan con productos y colores.
 *
 * ── Reglas clave ────────────────────────────────────────────────────────────
 *  R1  Solo dos niveles: categoría y subcategoría. La tabla `sub_subcategorias`
 *      del DDL NO se usa.
 *  R2  Nombres obligatorios, con trim y máximo 100 caracteres.
 *  R3  Unicidad: categoría, marca, tipo de resina y presentación → global;
 *      subcategoría → por categoría; línea y base → por marca.
 *  R4  Nunca hay borrado físico: solo baja lógica. No existe ruta DELETE.
 *  R5  Desactivar en cascada: categoría → sus subcategorías; marca → sus líneas
 *      y bases (colores, productos y campañas se sumarán cuando existan).
 *  R6  Antes de desactivar se informa el impacto (GET .../impacto-desactivacion).
 *      Si hay elementos afectados, el servidor exige `confirmar: true`; sin él
 *      responde 409 CONFIRMACION_REQUERIDA con el impacto.
 *  R7  Reactivar NO reactiva en cascada a los hijos (decisión D3).
 *  R8  No se crean líneas ni bases bajo una marca inactiva, ni subcategorías
 *      bajo una categoría inactiva.
 *  R9  Marca: logotipo obligatorio, jpeg/png/webp, máximo 5 MB (supuesto aprobado
 *      por el Product Owner; el "Anexo B de la Tanda 2" sigue pendiente).
 *  R10 Base: SIN tipo de resina, por petición explícita del Product Owner
 *      (contradice RF-CAT-12-01; ver M01_REGLAS_ADICIONALES.md).
 *  R11 Presentación: nombre único y volumen > 0.
 *  R12 Autorización siempre en servidor; el 403 es el opaco estándar de M17.
 *
 * ── Decisiones por defecto (el Tech Lead puede vetarlas) ────────────────────
 *  D1  Permisos (la spec habla de «Gestión del catálogo» y «Gestión de
 *      productos», que NO existen en el seed; se usan los `catalogo.*` reales):
 *      leer → catalogo.ver · crear → catalogo.crear · editar y reactivar →
 *      catalogo.editar · desactivar → catalogo.eliminar. Sin tocar el seed.
 *  D2  El logotipo viaja en base64 dentro de JSON, como el RUT de M04. Requiere
 *      subir el límite de JSON solo para esa ruta (archivo compartido → PR aparte).
 *  D3  Reactivar un padre no reactiva a los hijos: el administrador decide.
 *  D4  La unicidad de nombres se compara sin distinguir mayúsculas y sin
 *      espacios sobrantes (se normaliza antes de comparar).
 *
 * Regla de Oro #1: Cero código sin contrato previo.
 * Regla de Oro #11: Tolerancia Cero al tipo `any`.
 * ============================================================================
 */

/* ───────────────────────────────────────────────────────────────────────────
 * 1. PRIMITIVAS Y ENUMS
 * ─────────────────────────────────────────────────────────────────────────── */

export const LOGOTIPO_MAXIMO_BYTES = 5 * 1024 * 1024;
/** Largo máximo del texto base64 de un archivo de 5 MB (4/3 del tamaño + relleno). */
export const LOGOTIPO_MAXIMO_BASE64 = 6_990_508;
export const TIPOS_MIME_LOGOTIPO = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const idSchema = z.number().int().positive();
export const nombreSchema = z.string().trim().min(1).max(100);
export const ordenSchema = z.number().int().min(0).max(100_000);

export const estadoSchema = z.enum(['activo', 'inactivo']);
export type Estado = z.infer<typeof estadoSchema>;

export const tipoMimeLogotipoSchema = z.enum(TIPOS_MIME_LOGOTIPO);

/* ───────────────────────────────────────────────────────────────────────────
 * 2. ENTIDADES
 * ─────────────────────────────────────────────────────────────────────────── */

export const subcategoriaSchema = z.object({
  idSubcategoria: idSchema,
  idCategoria: idSchema,
  nombre: z.string(),
  orden: ordenSchema,
  estado: estadoSchema,
});
export type Subcategoria = z.infer<typeof subcategoriaSchema>;

export const categoriaSchema = z.object({
  idCategoria: idSchema,
  nombre: z.string(),
  orden: ordenSchema,
  estado: estadoSchema,
  subcategorias: z.array(subcategoriaSchema),
});
export type Categoria = z.infer<typeof categoriaSchema>;

export const marcaSchema = z.object({
  idMarca: idSchema,
  nombre: z.string(),
  estado: estadoSchema,
  /** Los bytes se piden aparte: GET /marcas/:idMarca/logotipo. */
  logotipoMimeType: tipoMimeLogotipoSchema,
});
export type Marca = z.infer<typeof marcaSchema>;

export const lineaSchema = z.object({
  idLinea: idSchema,
  idMarca: idSchema,
  nombre: z.string(),
  gamaComercial: z.string().nullable(),
  estado: estadoSchema,
});
export type Linea = z.infer<typeof lineaSchema>;

/** Sin tipo de resina (R10). */
export const baseSchema = z.object({
  idBase: idSchema,
  idMarca: idSchema,
  nombre: z.string(),
  estado: estadoSchema,
});
export type Base = z.infer<typeof baseSchema>;

export const tipoResinaSchema = z.object({
  idTipoResina: idSchema,
  nombre: z.string(),
  estado: estadoSchema,
});
export type TipoResina = z.infer<typeof tipoResinaSchema>;

export const presentacionSchema = z.object({
  idPresentacion: idSchema,
  nombre: z.string(),
  /** Volumen numérico para comparar precios entre productos. Unidad: ver Q1. */
  volumen: z.number().positive(),
  estado: estadoSchema,
});
export type Presentacion = z.infer<typeof presentacionSchema>;

/** Efecto de una desactivación (R6). Los contadores de M06 valen 0 hasta que exista. */
export const impactoDesactivacionSchema = z.object({
  productos: z.number().int().nonnegative(),
  subcategorias: z.number().int().nonnegative(),
  lineas: z.number().int().nonnegative(),
  bases: z.number().int().nonnegative(),
  reglasComerciales: z.number().int().nonnegative(),
});
export type ImpactoDesactivacion = z.infer<typeof impactoDesactivacionSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 3. PETICIONES (REQUEST)
 * ─────────────────────────────────────────────────────────────────────────── */

export const paginacionQuerySchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(20),
});

export const listarBaseRequestSchema = paginacionQuerySchema.extend({
  busqueda: z.string().trim().max(100).optional(),
  estado: estadoSchema.optional(),
});
export type ListarBaseRequest = z.infer<typeof listarBaseRequestSchema>;

/** GET /categorias — devuelve el árbol completo, sin paginar. */
export const listarCategoriasRequestSchema = z.object({
  estado: estadoSchema.optional(),
});
export type ListarCategoriasRequest = z.infer<typeof listarCategoriasRequestSchema>;

/** GET /lineas y GET /bases — filtro opcional por marca. */
export const listarPorMarcaRequestSchema = listarBaseRequestSchema.extend({
  idMarca: z.coerce.number().int().positive().optional(),
});
export type ListarPorMarcaRequest = z.infer<typeof listarPorMarcaRequestSchema>;

/** PATCH .../estado en cualquier recurso. */
export const cambiarEstadoRequestSchema = z.object({
  estado: estadoSchema,
  /** Obligatorio en true si al desactivar hay elementos afectados (R6). */
  confirmar: z.boolean().default(false),
});
export type CambiarEstadoRequest = z.infer<typeof cambiarEstadoRequestSchema>;

export const crearCategoriaRequestSchema = z.object({
  nombre: nombreSchema,
  orden: ordenSchema.default(0),
});
export type CrearCategoriaRequest = z.infer<typeof crearCategoriaRequestSchema>;
/** Sin `default` en `orden`: editar con un cuerpo vacío no debe reiniciarlo a 0. */
export const editarCategoriaRequestSchema = z
  .object({ nombre: nombreSchema.optional(), orden: ordenSchema.optional() })
  .refine((v) => v.nombre !== undefined || v.orden !== undefined, {
    message: 'Debe enviarse al menos un campo',
  });
export type EditarCategoriaRequest = z.infer<typeof editarCategoriaRequestSchema>;

/** POST /categorias/:idCategoria/subcategorias — el padre va en la ruta. */
export const crearSubcategoriaRequestSchema = crearCategoriaRequestSchema;
export type CrearSubcategoriaRequest = z.infer<typeof crearSubcategoriaRequestSchema>;
export const editarSubcategoriaRequestSchema = editarCategoriaRequestSchema;
export type EditarSubcategoriaRequest = z.infer<typeof editarSubcategoriaRequestSchema>;

/** POST /marcas — el logotipo es obligatorio (R9). */
export const crearMarcaRequestSchema = z.object({
  nombre: nombreSchema,
  logotipoBase64: z.string().min(1).max(LOGOTIPO_MAXIMO_BASE64),
  logotipoMimeType: tipoMimeLogotipoSchema,
});
export type CrearMarcaRequest = z.infer<typeof crearMarcaRequestSchema>;
export const editarMarcaRequestSchema = z.object({ nombre: nombreSchema });
export type EditarMarcaRequest = z.infer<typeof editarMarcaRequestSchema>;
/** PUT /marcas/:idMarca/logotipo */
export const reemplazarLogotipoRequestSchema = crearMarcaRequestSchema.pick({
  logotipoBase64: true,
  logotipoMimeType: true,
});
export type ReemplazarLogotipoRequest = z.infer<typeof reemplazarLogotipoRequestSchema>;

export const crearLineaRequestSchema = z.object({
  idMarca: idSchema,
  nombre: nombreSchema,
  gamaComercial: z.string().trim().max(100).nullable().optional(),
});
export type CrearLineaRequest = z.infer<typeof crearLineaRequestSchema>;
/** La marca de una línea no cambia: editar solo toca nombre y gama. */
export const editarLineaRequestSchema = crearLineaRequestSchema.omit({ idMarca: true }).partial().refine(
  (v) => Object.keys(v).length > 0,
  { message: 'Debe enviarse al menos un campo' },
);
export type EditarLineaRequest = z.infer<typeof editarLineaRequestSchema>;

export const crearBaseRequestSchema = z.object({ idMarca: idSchema, nombre: nombreSchema });
export type CrearBaseRequest = z.infer<typeof crearBaseRequestSchema>;
export const editarBaseRequestSchema = z.object({ nombre: nombreSchema });
export type EditarBaseRequest = z.infer<typeof editarBaseRequestSchema>;

export const crearTipoResinaRequestSchema = z.object({ nombre: nombreSchema });
export type CrearTipoResinaRequest = z.infer<typeof crearTipoResinaRequestSchema>;
export const editarTipoResinaRequestSchema = crearTipoResinaRequestSchema;
export type EditarTipoResinaRequest = z.infer<typeof editarTipoResinaRequestSchema>;

export const crearPresentacionRequestSchema = z.object({
  nombre: nombreSchema,
  volumen: z.number().positive().max(9_999_999),
});
export type CrearPresentacionRequest = z.infer<typeof crearPresentacionRequestSchema>;
export const editarPresentacionRequestSchema = crearPresentacionRequestSchema.partial().refine(
  (v) => Object.keys(v).length > 0,
  { message: 'Debe enviarse al menos un campo' },
);
export type EditarPresentacionRequest = z.infer<typeof editarPresentacionRequestSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 4. RESPUESTAS (ENVELOPES CANÓNICOS)
 * ─────────────────────────────────────────────────────────────────────────── */

export const paginacionSchema = z.object({
  pagina: z.number().int().positive(),
  limite: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPaginas: z.number().int().nonnegative(),
});

export const categoriaResponseEnvelopeSchema = z.object({ success: z.literal(true), data: categoriaSchema });
export type CategoriaResponseEnvelope = z.infer<typeof categoriaResponseEnvelopeSchema>;
export const listarCategoriasResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.array(categoriaSchema),
});
export type ListarCategoriasResponseEnvelope = z.infer<typeof listarCategoriasResponseEnvelopeSchema>;
export const subcategoriaResponseEnvelopeSchema = z.object({ success: z.literal(true), data: subcategoriaSchema });
export type SubcategoriaResponseEnvelope = z.infer<typeof subcategoriaResponseEnvelopeSchema>;

export const marcaResponseEnvelopeSchema = z.object({ success: z.literal(true), data: marcaSchema });
export type MarcaResponseEnvelope = z.infer<typeof marcaResponseEnvelopeSchema>;
export const listarMarcasResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.array(marcaSchema),
  pagination: paginacionSchema,
});
export type ListarMarcasResponseEnvelope = z.infer<typeof listarMarcasResponseEnvelopeSchema>;

export const lineaResponseEnvelopeSchema = z.object({ success: z.literal(true), data: lineaSchema });
export type LineaResponseEnvelope = z.infer<typeof lineaResponseEnvelopeSchema>;
export const listarLineasResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.array(lineaSchema),
  pagination: paginacionSchema,
});
export type ListarLineasResponseEnvelope = z.infer<typeof listarLineasResponseEnvelopeSchema>;

export const baseResponseEnvelopeSchema = z.object({ success: z.literal(true), data: baseSchema });
export type BaseResponseEnvelope = z.infer<typeof baseResponseEnvelopeSchema>;
export const listarBasesResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.array(baseSchema),
  pagination: paginacionSchema,
});
export type ListarBasesResponseEnvelope = z.infer<typeof listarBasesResponseEnvelopeSchema>;

export const tipoResinaResponseEnvelopeSchema = z.object({ success: z.literal(true), data: tipoResinaSchema });
export type TipoResinaResponseEnvelope = z.infer<typeof tipoResinaResponseEnvelopeSchema>;
export const listarTiposResinaResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.array(tipoResinaSchema),
  pagination: paginacionSchema,
});
export type ListarTiposResinaResponseEnvelope = z.infer<typeof listarTiposResinaResponseEnvelopeSchema>;

export const presentacionResponseEnvelopeSchema = z.object({ success: z.literal(true), data: presentacionSchema });
export type PresentacionResponseEnvelope = z.infer<typeof presentacionResponseEnvelopeSchema>;
export const listarPresentacionesResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.array(presentacionSchema),
  pagination: paginacionSchema,
});
export type ListarPresentacionesResponseEnvelope = z.infer<typeof listarPresentacionesResponseEnvelopeSchema>;

export const impactoDesactivacionResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: impactoDesactivacionSchema,
});
export type ImpactoDesactivacionResponseEnvelope = z.infer<typeof impactoDesactivacionResponseEnvelopeSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 5. ERRORES (opacos donde aplica, HU-SEG-06 / RN-ADM-12)
 * ─────────────────────────────────────────────────────────────────────────── */

export const errorCatalogoEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({
    codigo: z.enum([
      'ACCESO_DENEGADO',
      'VALIDACION',
      'NO_ENCONTRADO',
      'NOMBRE_DUPLICADO',
      'PADRE_INACTIVO',
      'CONFIRMACION_REQUERIDA',
      'LOGOTIPO_INVALIDO',
    ]),
    mensaje: z.string(),
    /** Solo con CONFIRMACION_REQUERIDA: qué se vería afectado (R6). */
    impacto: impactoDesactivacionSchema.optional(),
  }),
});
export type ErrorCatalogoEnvelope = z.infer<typeof errorCatalogoEnvelopeSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 6. MAPA DE RUTAS (montaje: /api/v1/admin/catalogo)
 * ───────────────────────────────────────────────────────────────────────────
 *  Categorías y subcategorías
 *  GET   /categorias                                  catalogo.ver
 *  POST  /categorias                                  catalogo.crear
 *  PUT   /categorias/:idCategoria                     catalogo.editar
 *  PATCH /categorias/:idCategoria/estado              editar | eliminar (D1)
 *  GET   /categorias/:idCategoria/impacto-desactivacion  catalogo.ver
 *  POST  /categorias/:idCategoria/subcategorias       catalogo.crear
 *  PUT   /subcategorias/:idSubcategoria               catalogo.editar
 *  PATCH /subcategorias/:idSubcategoria/estado        editar | eliminar
 *  GET   /subcategorias/:idSubcategoria/impacto-desactivacion  catalogo.ver
 *
 *  Marcas
 *  GET   /marcas · POST /marcas · GET /marcas/:idMarca · PUT /marcas/:idMarca
 *  PUT   /marcas/:idMarca/logotipo · GET /marcas/:idMarca/logotipo (bytes)
 *  PATCH /marcas/:idMarca/estado · GET /marcas/:idMarca/impacto-desactivacion
 *
 *  Líneas · Bases (?idMarca opcional)
 *  GET · POST · PUT /:id · PATCH /:id/estado · GET /:id/impacto-desactivacion
 *  en /lineas y /bases
 *
 *  Tipos de resina · Presentaciones
 *  GET · POST · PUT /:id · PATCH /:id/estado   en /tipos-resina y /presentaciones
 * ─────────────────────────────────────────────────────────────────────────── */
