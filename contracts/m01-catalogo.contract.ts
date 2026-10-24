import { z } from 'zod';

/**
 * ============================================================================
 * CONTRATO DE API REST — M01. Catálogo · ENTREGA 1: CATÁLOGOS BASE
 * ============================================================================
 * Scope: m01-catalogo · Ola 2 · Base de datos: esquema 4.3 (PR #14)
 *
 * Este contrato ES la especificación de la entrega y lo que el Tech Lead revisa
 * antes de que se escriba el backend. Todo lo que cambie aquí cambia el módulo.
 * Reglas del cliente y modelo: docs/02_MODULOS_FUNCIONALES/M01_REGLAS_ADICIONALES.md
 * Spec base: M01_ESPECIFICACION_CATALOGO.md · Entrega 2: m01-catalogo-productos.contract.ts
 *
 * ── Qué incluye ─────────────────────────────────────────────────────────────
 *  Categorías y subcategorías (HU-CAT-01) · marcas (HU-CAT-04) · líneas
 *  (HU-CAT-11) · superficies · tipos de resina · acabados · bases · familias de
 *  color · tipos de medida y medidas.
 *
 * ── Qué NO incluye (entrega 2) ──────────────────────────────────────────────
 *  Colores, productos, variantes, consulta pública. Imágenes y combos: entrega 3.
 *
 * ── Reglas clave ────────────────────────────────────────────────────────────
 *  R1  Solo dos niveles de clasificación: categoría → subcategoría.
 *  R2  Nombres obligatorios, con trim y máximo 100 caracteres (50 en acabado,
 *      base, familia, tipo de medida; 60 en medida).
 *  R3  Unicidad global: categoría, marca, tipo de resina, superficie, acabado,
 *      base, familia de color, tipo de medida, medida (nombre y tipo+valor).
 *      Por padre: subcategoría (categoría) y línea (marca).
 *  R4  Nunca hay borrado físico: solo baja lógica. No existe ruta DELETE.
 *  R5  Desactivar en cascada: categoría → sus subcategorías; marca → sus líneas y
 *      sus colores; tipo de medida → sus medidas. Un producto es visible solo si su
 *      marca, su línea (si tiene), su subcategoría y su categoría están activas; si
 *      no, sale del catálogo público sin darse de baja.
 *  R6  Antes de desactivar se informa el impacto (GET .../impacto-desactivacion).
 *      Si hay elementos afectados, el servidor exige `confirmar: true`; sin él
 *      responde 409 CONFIRMACION_REQUERIDA con el impacto.
 *  R7  Reactivar NO reactiva a los hijos, pero SÍ verifica que el padre esté
 *      activo (RF-CAT-09-04): si no, 409 PADRE_INACTIVO.
 *  R8  No se crean subcategorías bajo una categoría inactiva, líneas bajo una marca
 *      inactiva ni medidas bajo un tipo de medida inactivo (PADRE_INACTIVO).
 *  R9  Marca: logotipo obligatorio, jpeg/png/webp, máximo 5 MB (supuesto aprobado
 *      por el Product Owner; el "Anexo B de la Tanda 2" sigue pendiente).
 *  R10 Las bases son globales (Tint, Deep, Pastel, Accent) y no dependen de la
 *      marca. Los acabados también (Brillante, Mate, Semimate, Satinado,
 *      Transparente).
 *  R11 El acabado "Brillante" es el acabado por defecto de los colores: no se
 *      puede desactivar ni renombrar (se identifica por su nombre).
 *  R12 Una medida es valor + tipo de medida (ej. 1 + galón). Si no se envía el nombre
 *      se genera con la abreviatura ("1 gal", "0.25 gal", "2 in"). Una medida o un
 *      tipo de medida con variantes solo se desactiva.
 *  R13 La familia de color lleva un hexadecimal #RRGGBB para su muestra.
 *  R14 Autorización siempre en servidor. Toda denegación (sin sesión, sin permiso) responde
 *      404 RECURSO_NO_DISPONIBLE, idéntica a la de un recurso inexistente (ADR-003).
 *
 * ── Decisiones por defecto (el Tech Lead puede vetarlas) ────────────────────
 *  D1  Permisos (la spec habla de «Gestión del catálogo» y «Gestión de
 *      productos», que NO existen en el seed; se usan los `catalogo.*` reales):
 *      leer → catalogo.ver · crear → catalogo.crear · editar y reactivar →
 *      catalogo.editar · desactivar → catalogo.eliminar. Sin tocar el seed.
 *  D2  El logotipo viaja en base64 dentro de JSON, como el RUT de M04. El límite de JSON sube
 *      a 7 MB solo en POST /admin/catalogo/marcas y PUT /admin/catalogo/marcas/:idMarca/logotipo
 *      (core/cuerpoJson.middleware.ts, PR aparte); el resto de rutas conserva 100 KB.
 *  D3  Reactivar un padre no reactiva a los hijos: el administrador decide.
 *  D4  La unicidad de nombres se compara sin distinguir mayúsculas y sin
 *      espacios sobrantes (se normaliza antes de comparar).
 *  D5  Los catálogos pequeños (superficies, resinas, acabados, bases, familias,
 *      tipos de medida) se devuelven completos, sin paginar. Marcas, líneas y
 *      medidas van paginadas; las categorías, como árbol completo.
 *  D6  `equivalenciaGalones` en el tipo de medida (galón = 1, litro = 0,264172,
 *      mililitro = 0,000264172) permite derivar el rendimiento por presentación
 *      (RF-CAT-10-03). REQUIERE agregar la columna `equivalencia_galones` a
 *      `tipo_medida` en el esquema 4.3 (PR #14). Si se veta, el rendimiento por
 *      medida no se calcula y solo se muestra el rendimiento por galón.
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
export const ACABADO_POR_DEFECTO = 'Brillante';

export const idSchema = z.number().int().positive();
export const nombreSchema = z.string().trim().min(1).max(100);
export const nombreCortoSchema = z.string().trim().min(1).max(50);
export const ordenSchema = z.number().int().min(0).max(100_000);
export const hexadecimalSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Use el formato #RRGGBB');

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

export const superficieSchema = z.object({
  idSuperficie: idSchema,
  nombre: z.string(),
  orden: ordenSchema,
  estado: estadoSchema,
});
export type Superficie = z.infer<typeof superficieSchema>;

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

export const tipoResinaSchema = z.object({
  idTipoResina: idSchema,
  nombre: z.string(),
  estado: estadoSchema,
});
export type TipoResina = z.infer<typeof tipoResinaSchema>;

export const acabadoSchema = z.object({
  idAcabado: idSchema,
  nombre: z.string(),
  orden: ordenSchema,
  estado: estadoSchema,
});
export type Acabado = z.infer<typeof acabadoSchema>;

export const baseSchema = z.object({
  idBase: idSchema,
  nombre: z.string(),
  orden: ordenSchema,
  estado: estadoSchema,
});
export type Base = z.infer<typeof baseSchema>;

export const familiaColorSchema = z.object({
  idFamiliaColor: idSchema,
  nombre: z.string(),
  hexadecimal: z.string(),
  orden: ordenSchema,
  estado: estadoSchema,
});
export type FamiliaColor = z.infer<typeof familiaColorSchema>;

export const tipoMedidaSchema = z.object({
  idTipoMedida: idSchema,
  nombre: z.string(),
  abreviatura: z.string(),
  /** Cuántos galones equivale una unidad de este tipo; null si no es de volumen (D6). */
  equivalenciaGalones: z.number().positive().nullable(),
  estado: estadoSchema,
});
export type TipoMedida = z.infer<typeof tipoMedidaSchema>;

export const medidaSchema = z.object({
  idMedida: idSchema,
  idTipoMedida: idSchema,
  valor: z.number().positive(),
  nombre: z.string(),
  estado: estadoSchema,
});
export type Medida = z.infer<typeof medidaSchema>;

/**
 * Efecto de una desactivación (R6). Cada recurso llena solo lo que le aplica; el
 * resto vale 0. `reglasComerciales` es de M06 y vale 0 hasta que exista.
 */
export const impactoDesactivacionSchema = z.object({
  productos: z.number().int().nonnegative(),
  subcategorias: z.number().int().nonnegative(),
  lineas: z.number().int().nonnegative(),
  colores: z.number().int().nonnegative(),
  variantes: z.number().int().nonnegative(),
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

/** GET en catálogos pequeños y en categorías (D5): sin paginar. */
export const listarCompletoRequestSchema = z.object({
  estado: estadoSchema.optional(),
});
export type ListarCompletoRequest = z.infer<typeof listarCompletoRequestSchema>;

/** GET /lineas — filtro opcional por marca. */
export const listarLineasRequestSchema = listarBaseRequestSchema.extend({
  idMarca: z.coerce.number().int().positive().optional(),
});
export type ListarLineasRequest = z.infer<typeof listarLineasRequestSchema>;

/** GET /medidas — filtro opcional por tipo de medida. */
export const listarMedidasRequestSchema = listarBaseRequestSchema.extend({
  idTipoMedida: z.coerce.number().int().positive().optional(),
});
export type ListarMedidasRequest = z.infer<typeof listarMedidasRequestSchema>;

/** PATCH .../estado en cualquier recurso. */
export const cambiarEstadoRequestSchema = z.object({
  estado: estadoSchema,
  /** Obligatorio en true si al desactivar hay elementos afectados (R6). */
  confirmar: z.boolean().default(false),
});
export type CambiarEstadoRequest = z.infer<typeof cambiarEstadoRequestSchema>;

/** Edición parcial: al menos un campo. Sin `default`, para no reiniciar valores. */
const alMenosUnCampo = (v: Record<string, unknown>): boolean =>
  Object.values(v).some((valor) => valor !== undefined);
const MENSAJE_SIN_CAMPOS = { message: 'Debe enviarse al menos un campo' };

export const crearCategoriaRequestSchema = z.object({
  nombre: nombreSchema,
  orden: ordenSchema.default(0),
});
export type CrearCategoriaRequest = z.infer<typeof crearCategoriaRequestSchema>;
export const editarCategoriaRequestSchema = z
  .object({ nombre: nombreSchema.optional(), orden: ordenSchema.optional() })
  .refine(alMenosUnCampo, MENSAJE_SIN_CAMPOS);
export type EditarCategoriaRequest = z.infer<typeof editarCategoriaRequestSchema>;

/** POST /categorias/:idCategoria/subcategorias — el padre va en la ruta. */
export const crearSubcategoriaRequestSchema = crearCategoriaRequestSchema;
export type CrearSubcategoriaRequest = z.infer<typeof crearSubcategoriaRequestSchema>;
export const editarSubcategoriaRequestSchema = editarCategoriaRequestSchema;
export type EditarSubcategoriaRequest = z.infer<typeof editarSubcategoriaRequestSchema>;

/** Superficies, acabados y bases comparten forma: nombre corto y orden. */
export const crearSuperficieRequestSchema = z.object({ nombre: nombreSchema, orden: ordenSchema.default(0) });
export type CrearSuperficieRequest = z.infer<typeof crearSuperficieRequestSchema>;
export const editarSuperficieRequestSchema = z
  .object({ nombre: nombreSchema.optional(), orden: ordenSchema.optional() })
  .refine(alMenosUnCampo, MENSAJE_SIN_CAMPOS);
export type EditarSuperficieRequest = z.infer<typeof editarSuperficieRequestSchema>;

export const crearAcabadoRequestSchema = z.object({ nombre: nombreCortoSchema, orden: ordenSchema.default(0) });
export type CrearAcabadoRequest = z.infer<typeof crearAcabadoRequestSchema>;
export const editarAcabadoRequestSchema = z
  .object({ nombre: nombreCortoSchema.optional(), orden: ordenSchema.optional() })
  .refine(alMenosUnCampo, MENSAJE_SIN_CAMPOS);
export type EditarAcabadoRequest = z.infer<typeof editarAcabadoRequestSchema>;

export const crearBaseRequestSchema = z.object({ nombre: nombreCortoSchema, orden: ordenSchema.default(0) });
export type CrearBaseRequest = z.infer<typeof crearBaseRequestSchema>;
export const editarBaseRequestSchema = z
  .object({ nombre: nombreCortoSchema.optional(), orden: ordenSchema.optional() })
  .refine(alMenosUnCampo, MENSAJE_SIN_CAMPOS);
export type EditarBaseRequest = z.infer<typeof editarBaseRequestSchema>;

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
export const editarLineaRequestSchema = z
  .object({
    nombre: nombreSchema.optional(),
    gamaComercial: z.string().trim().max(100).nullable().optional(),
  })
  .refine(alMenosUnCampo, MENSAJE_SIN_CAMPOS);
export type EditarLineaRequest = z.infer<typeof editarLineaRequestSchema>;

export const crearTipoResinaRequestSchema = z.object({ nombre: nombreSchema });
export type CrearTipoResinaRequest = z.infer<typeof crearTipoResinaRequestSchema>;
export const editarTipoResinaRequestSchema = crearTipoResinaRequestSchema;
export type EditarTipoResinaRequest = z.infer<typeof editarTipoResinaRequestSchema>;

export const crearFamiliaColorRequestSchema = z.object({
  nombre: nombreCortoSchema,
  hexadecimal: hexadecimalSchema,
  orden: ordenSchema.default(0),
});
export type CrearFamiliaColorRequest = z.infer<typeof crearFamiliaColorRequestSchema>;
export const editarFamiliaColorRequestSchema = z
  .object({
    nombre: nombreCortoSchema.optional(),
    hexadecimal: hexadecimalSchema.optional(),
    orden: ordenSchema.optional(),
  })
  .refine(alMenosUnCampo, MENSAJE_SIN_CAMPOS);
export type EditarFamiliaColorRequest = z.infer<typeof editarFamiliaColorRequestSchema>;

export const crearTipoMedidaRequestSchema = z.object({
  nombre: nombreCortoSchema,
  abreviatura: z.string().trim().min(1).max(10),
  equivalenciaGalones: z.number().positive().max(1_000_000).nullable().optional(),
});
export type CrearTipoMedidaRequest = z.infer<typeof crearTipoMedidaRequestSchema>;
export const editarTipoMedidaRequestSchema = z
  .object({
    nombre: nombreCortoSchema.optional(),
    abreviatura: z.string().trim().min(1).max(10).optional(),
    equivalenciaGalones: z.number().positive().max(1_000_000).nullable().optional(),
  })
  .refine(alMenosUnCampo, MENSAJE_SIN_CAMPOS);
export type EditarTipoMedidaRequest = z.infer<typeof editarTipoMedidaRequestSchema>;

export const crearMedidaRequestSchema = z.object({
  idTipoMedida: idSchema,
  valor: z.number().positive().max(9_999_999),
  /** Si se omite se genera: "{valor} {abreviatura}" (R12). */
  nombre: z.string().trim().min(1).max(60).optional(),
});
export type CrearMedidaRequest = z.infer<typeof crearMedidaRequestSchema>;
/** El tipo no cambia; para otro tipo se crea otra medida. */
export const editarMedidaRequestSchema = z
  .object({ valor: z.number().positive().max(9_999_999).optional(), nombre: z.string().trim().min(1).max(60).optional() })
  .refine(alMenosUnCampo, MENSAJE_SIN_CAMPOS);
export type EditarMedidaRequest = z.infer<typeof editarMedidaRequestSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 4. RESPUESTAS (ENVELOPES CANÓNICOS)
 * ─────────────────────────────────────────────────────────────────────────── */

export const paginacionSchema = z.object({
  pagina: z.number().int().positive(),
  limite: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPaginas: z.number().int().nonnegative(),
});
export type Paginacion = z.infer<typeof paginacionSchema>;

/** Respuesta de un solo elemento. */
export const respuestaUno = <T extends z.ZodType>(item: T) =>
  z.object({ success: z.literal(true), data: item });
/** Respuesta de una lista completa, sin paginar (D5). */
export const respuestaLista = <T extends z.ZodType>(item: T) =>
  z.object({ success: z.literal(true), data: z.array(item) });
/** Respuesta paginada. */
export const respuestaPaginada = <T extends z.ZodType>(item: T) =>
  z.object({ success: z.literal(true), data: z.array(item), pagination: paginacionSchema });

export const categoriaResponseEnvelopeSchema = respuestaUno(categoriaSchema);
export type CategoriaResponseEnvelope = z.infer<typeof categoriaResponseEnvelopeSchema>;
export const listarCategoriasResponseEnvelopeSchema = respuestaLista(categoriaSchema);
export type ListarCategoriasResponseEnvelope = z.infer<typeof listarCategoriasResponseEnvelopeSchema>;
export const subcategoriaResponseEnvelopeSchema = respuestaUno(subcategoriaSchema);
export type SubcategoriaResponseEnvelope = z.infer<typeof subcategoriaResponseEnvelopeSchema>;

export const superficieResponseEnvelopeSchema = respuestaUno(superficieSchema);
export type SuperficieResponseEnvelope = z.infer<typeof superficieResponseEnvelopeSchema>;
export const listarSuperficiesResponseEnvelopeSchema = respuestaLista(superficieSchema);
export type ListarSuperficiesResponseEnvelope = z.infer<typeof listarSuperficiesResponseEnvelopeSchema>;

export const marcaResponseEnvelopeSchema = respuestaUno(marcaSchema);
export type MarcaResponseEnvelope = z.infer<typeof marcaResponseEnvelopeSchema>;
export const listarMarcasResponseEnvelopeSchema = respuestaPaginada(marcaSchema);
export type ListarMarcasResponseEnvelope = z.infer<typeof listarMarcasResponseEnvelopeSchema>;

export const lineaResponseEnvelopeSchema = respuestaUno(lineaSchema);
export type LineaResponseEnvelope = z.infer<typeof lineaResponseEnvelopeSchema>;
export const listarLineasResponseEnvelopeSchema = respuestaPaginada(lineaSchema);
export type ListarLineasResponseEnvelope = z.infer<typeof listarLineasResponseEnvelopeSchema>;

export const tipoResinaResponseEnvelopeSchema = respuestaUno(tipoResinaSchema);
export type TipoResinaResponseEnvelope = z.infer<typeof tipoResinaResponseEnvelopeSchema>;
export const listarTiposResinaResponseEnvelopeSchema = respuestaLista(tipoResinaSchema);
export type ListarTiposResinaResponseEnvelope = z.infer<typeof listarTiposResinaResponseEnvelopeSchema>;

export const acabadoResponseEnvelopeSchema = respuestaUno(acabadoSchema);
export type AcabadoResponseEnvelope = z.infer<typeof acabadoResponseEnvelopeSchema>;
export const listarAcabadosResponseEnvelopeSchema = respuestaLista(acabadoSchema);
export type ListarAcabadosResponseEnvelope = z.infer<typeof listarAcabadosResponseEnvelopeSchema>;

export const baseResponseEnvelopeSchema = respuestaUno(baseSchema);
export type BaseResponseEnvelope = z.infer<typeof baseResponseEnvelopeSchema>;
export const listarBasesResponseEnvelopeSchema = respuestaLista(baseSchema);
export type ListarBasesResponseEnvelope = z.infer<typeof listarBasesResponseEnvelopeSchema>;

export const familiaColorResponseEnvelopeSchema = respuestaUno(familiaColorSchema);
export type FamiliaColorResponseEnvelope = z.infer<typeof familiaColorResponseEnvelopeSchema>;
export const listarFamiliasColorResponseEnvelopeSchema = respuestaLista(familiaColorSchema);
export type ListarFamiliasColorResponseEnvelope = z.infer<typeof listarFamiliasColorResponseEnvelopeSchema>;

export const tipoMedidaResponseEnvelopeSchema = respuestaUno(tipoMedidaSchema);
export type TipoMedidaResponseEnvelope = z.infer<typeof tipoMedidaResponseEnvelopeSchema>;
export const listarTiposMedidaResponseEnvelopeSchema = respuestaLista(tipoMedidaSchema);
export type ListarTiposMedidaResponseEnvelope = z.infer<typeof listarTiposMedidaResponseEnvelopeSchema>;

export const medidaResponseEnvelopeSchema = respuestaUno(medidaSchema);
export type MedidaResponseEnvelope = z.infer<typeof medidaResponseEnvelopeSchema>;
export const listarMedidasResponseEnvelopeSchema = respuestaPaginada(medidaSchema);
export type ListarMedidasResponseEnvelope = z.infer<typeof listarMedidasResponseEnvelopeSchema>;

export const impactoDesactivacionResponseEnvelopeSchema = respuestaUno(impactoDesactivacionSchema);
export type ImpactoDesactivacionResponseEnvelope = z.infer<typeof impactoDesactivacionResponseEnvelopeSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 5. ERRORES (opacos donde aplica, HU-SEG-06 / RN-ADM-12)
 * ─────────────────────────────────────────────────────────────────────────── */

/**
 * Errores con el envelope global del backend: `{ success: false, error: { code, message, details } }`.
 * Estados HTTP: 400 PARAMETRO_INVALIDO · 400 LOGOTIPO_INVALIDO · 404 RECURSO_NO_DISPONIBLE
 * (también para toda denegación) · 409 NOMBRE_DUPLICADO, PADRE_INACTIVO, CONFIRMACION_REQUERIDA,
 * ACABADO_PROTEGIDO · 413 CUERPO_DEMASIADO_GRANDE.
 */
export const CODIGOS_ERROR_CATALOGO = [
  'PARAMETRO_INVALIDO',
  'RECURSO_NO_DISPONIBLE',
  'NOMBRE_DUPLICADO',
  'PADRE_INACTIVO',
  'CONFIRMACION_REQUERIDA',
  'LOGOTIPO_INVALIDO',
  'ACABADO_PROTEGIDO',
  'CUERPO_DEMASIADO_GRANDE',
] as const;

export const errorCatalogoEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.enum(CODIGOS_ERROR_CATALOGO),
    message: z.string(),
    /** Solo con CONFIRMACION_REQUERIDA: qué se vería afectado (R6). En el resto, null. */
    details: impactoDesactivacionSchema.nullable(),
  }),
});
export type ErrorCatalogoEnvelope = z.infer<typeof errorCatalogoEnvelopeSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 6. MAPA DE RUTAS (montaje: /api/v1/admin/catalogo)
 * ───────────────────────────────────────────────────────────────────────────
 *  Permisos (D1): GET → catalogo.ver · POST → catalogo.crear · PUT → catalogo.editar ·
 *  PATCH estado: activar → catalogo.editar, desactivar → catalogo.eliminar.
 *
 *  Categorías y subcategorías
 *  GET   /categorias                                           (árbol completo)
 *  POST  /categorias · PUT /categorias/:idCategoria
 *  PATCH /categorias/:idCategoria/estado
 *  GET   /categorias/:idCategoria/impacto-desactivacion
 *  POST  /categorias/:idCategoria/subcategorias
 *  PUT   /subcategorias/:idSubcategoria
 *  PATCH /subcategorias/:idSubcategoria/estado
 *  GET   /subcategorias/:idSubcategoria/impacto-desactivacion
 *
 *  Marcas
 *  GET /marcas · POST /marcas · GET /marcas/:idMarca · PUT /marcas/:idMarca
 *  PUT /marcas/:idMarca/logotipo · GET /marcas/:idMarca/logotipo (bytes)
 *  PATCH /marcas/:idMarca/estado · GET /marcas/:idMarca/impacto-desactivacion
 *
 *  Líneas (?idMarca opcional)
 *  GET · POST · PUT /:id · PATCH /:id/estado · GET /:id/impacto-desactivacion   en /lineas
 *
 *  Catálogos pequeños (sin paginar)
 *  GET · POST · PUT /:id · PATCH /:id/estado · GET /:id/impacto-desactivacion
 *  en /superficies, /tipos-resina, /acabados, /bases, /familias-color, /tipos-medida
 *
 *  Medidas (?idTipoMedida opcional)
 *  GET · POST · PUT /:id · PATCH /:id/estado · GET /:id/impacto-desactivacion   en /medidas
 * ─────────────────────────────────────────────────────────────────────────── */
