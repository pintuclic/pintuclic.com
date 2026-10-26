import { z } from 'zod';

/**
 * Espejo fiel de `contracts/m01-catalogo.contract.ts` para ejecución en el backend
 * (el contrato vive fuera de `backend/src`). NO editar aquí: se cambia el contrato y
 * se copia. `m01-catalogo.contrato-espejo.test.ts` falla si ambos difieren.
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
  /** Categoría de la que se sugieren complementarios a sus productos sin una propia (entrega 3, D6). */
  idCategoriaComplementaria: idSchema.nullable(),
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
  /** Los bytes se piden aparte: GET /medidas/:idMedida/imagen (entrega 2). */
  tieneImagen: z.boolean(),
});
export type Medida = z.infer<typeof medidaSchema>;

/**
 * Efecto de una desactivación (R6). Cada recurso llena solo lo que le aplica; el
 * resto vale 0. `reglasComerciales` son los eventos de M06 (en curso o programados) que apuntan a la marca, línea, categoría, subcategoría, producto o variante.
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
export const crearSubcategoriaRequestSchema = crearCategoriaRequestSchema.extend({
  idCategoriaComplementaria: idSchema.nullable().optional(),
});
export type CrearSubcategoriaRequest = z.infer<typeof crearSubcategoriaRequestSchema>;
export const editarSubcategoriaRequestSchema = z
  .object({
    nombre: nombreSchema.optional(),
    orden: ordenSchema.optional(),
    idCategoriaComplementaria: idSchema.nullable().optional(),
  })
  .refine(alMenosUnCampo, MENSAJE_SIN_CAMPOS);
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
/** Se puede cambiar el tipo (debe estar activo) y el valor; el nombre generado se recalcula (R12). */
export const editarMedidaRequestSchema = z
  .object({
    idTipoMedida: idSchema.optional(),
    valor: z.number().positive().max(9_999_999).optional(),
    nombre: z.string().trim().min(1).max(60).optional(),
  })
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
