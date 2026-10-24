import { z } from 'zod';
import {
  estadoSchema,
  hexadecimalSchema,
  idSchema,
  nombreCortoSchema,
  nombreSchema,
  ordenSchema,
  paginacionQuerySchema,
  respuestaLista,
  respuestaPaginada,
  respuestaUno,
  paginacionSchema,
  impactoDesactivacionSchema,
} from './m01-catalogo.contract';

/**
 * ============================================================================
 * CONTRATO DE API REST — M01. Catálogo · ENTREGA 2: COLORES, PRODUCTOS Y VARIANTES
 * ============================================================================
 * Scope: m01-catalogo · Ola 2 · Base de datos: esquema 4.3 (PR #14)
 * Depende de la entrega 1 (m01-catalogo.contract.ts). Esta entrega es la que
 * desbloquea M13, M02, M05, M06, M03 y M14.
 *
 * Este contrato ES la especificación de la entrega y lo que el Tech Lead revisa
 * antes de que se escriba el backend. Reglas del cliente y modelo:
 * docs/02_MODULOS_FUNCIONALES/M01_REGLAS_ADICIONALES.md
 *
 * ── Qué incluye ─────────────────────────────────────────────────────────────
 *  Colores con importación por bloques (HU-CAT-05) · productos con ficha de
 *  recubrimiento, superficies, acabados, bases y colores de fábrica (HU-CAT-02,
 *  HU-CAT-10, HU-CAT-12) · variantes = producto + medida con precio (HU-CAT-03)
 *  · colores que ofrece cada producto · consulta pública (HU-CAT-06) · estado y
 *  ciclo de vida (HU-CAT-09).
 *
 * ── Qué NO incluye (entrega 3) ──────────────────────────────────────────────
 *  Imágenes (HU-CAT-07), combos (HU-CAT-13), productos complementarios
 *  (HU-CAT-08: el producto guarda la categoría complementaria, pero la
 *  sugerencia en sí llega en la entrega 3).
 *
 * ── Reglas de colores ───────────────────────────────────────────────────────
 *  C1  Un color es de una marca. Hexadecimal obligatorio (#RRGGBB): es su muestra.
 *  C2  El acabado es obligatorio; si no se envía es Brillante.
 *  C3  La base es OPCIONAL pero esencial. Un color sin base solo se ofrece como
 *      color de fábrica de un producto (ICO, aerosoles, transparente) y se marca
 *      `sinBase: true` para poder completarlo después.
 *  C4  La familia (Blancos, Rojos…) es opcional al crear; si no se envía, el
 *      servidor la deriva del hexadecimal (D8).
 *  C5  CIELAB es opcional y va completo (L, a, b) o no va.
 *  C6  Unicidad: (marca, nombre, acabado) y, cuando existe, (marca, código).
 *      "Negro Mate" y "Negro" (Brillante) pueden coexistir.
 *  C7  Desactivar un color (o su base o su acabado) lo retira de lo que ofrece
 *      cada producto; no toca variantes ni órdenes.
 *  C8  Importación: bloques de hasta 500 filas; las bases, acabados y familias
 *      se indican por NOMBRE; idempotente (se crea o actualiza por marca +
 *      nombre + acabado); la vista previa no escribe; cada fila se evalúa por
 *      separado y el bloque se aplica completo o no se aplica (transacción).
 *      Lo que una fila NO indica no se modifica en un color existente (base,
 *      familia y código vacíos conservan su valor); en uno nuevo, sin base y con
 *      la familia derivada (C4). Un código ya usado por otro color rechaza la fila.
 *
 * ── Reglas de productos ─────────────────────────────────────────────────────
 *  P1  Marca fija (no se edita). La línea, si existe, es de la misma marca.
 *      Pertenece a UNA subcategoría activa.
 *  P2  Con ficha de recubrimiento (pinturas, estucos, barnices…) la línea es
 *      obligatoria (D7). Sin ficha (herramientas, accesorios) no puede tener
 *      acabados, bases ni colores de fábrica.
 *  P3  Si tiene bases debe tener al menos un acabado; si no, no ofrecería color.
 *  P4  Clase derivada (nunca se envía): "entonable" si tiene bases;
 *      "colores_fijos" si no tiene bases pero sí colores de fábrica;
 *      "sin_color" si no tiene ninguno.
 *  P5  COLORES QUE OFRECE UN PRODUCTO = colores activos de su marca cuya base es
 *      una de sus bases Y cuyo acabado es uno de sus acabados, MÁS sus colores de
 *      fábrica. Una base inactiva retira sus colores (RF-CAT-12-06).
 *  P6  Los colores de fábrica deben ser de la marca del producto.
 *  P7  Publicar exige producto activo y al menos una variante activa. La imagen
 *      se exigirá en la entrega 3 (RF-CAT-02-05).
 *  P8  Desactivar la última variante activa de un producto publicado exige
 *      `confirmar: true` y lo despublica (el producto no se desactiva).
 *  P9  Desactivar un producto lo saca del público y no afecta órdenes (RF-CAT-09-02).
 *  P10 Reactivar verifica que la marca, la línea y la subcategoría estén
 *      activas (RF-CAT-09-04); si no, 409 PADRE_INACTIVO.
 *  P11 Las relaciones (superficies, acabados, bases, colores de fábrica,
 *      características) se REEMPLAZAN completas cuando se envían al editar (D11).
 *
 * ── Reglas de variantes ─────────────────────────────────────────────────────
 *  V1  Variante = producto + medida, con su precio. Una por pareja. El PRECIO es
 *      de la variante, nunca del producto ni del color (RC-20).
 *  V2  El color NO es parte de la variante. El SKU vendido lo compone M05: SKU de
 *      la variante + color (ej. P1-V2-ROJO) (RC-21).
 *  V3  El SKU es único. Si no se envía, se genera `P{idProducto}-V{idVariante}`.
 *  V4  Existencia referencial: entero ≥ 0, solo informativa; no bloquea ventas.
 *      Desde M13 sus ajustes pasan por M13 (D10).
 *  V5  La medida debe estar activa. La medida de una variante no cambia: para
 *      otra medida se crea otra variante.
 *  V6  Estados usados: activo e inactivo (D12).
 *
 * ── Reglas de consulta pública ──────────────────────────────────────────────
 *  U1  Sin autenticación. Solo productos activos y publicados cuya marca, línea
 *      (si tiene), subcategoría y categoría estén activas. Una ficha no disponible responde
 *      404 RECURSO_NO_DISPONIBLE.
 *  U2  Se ocultan las categorías y subcategorías sin productos visibles.
 *  U3  Todo se pagina y se resuelve bajo demanda: nunca se carga el catálogo ni
 *      la carta completa de colores (RNF-CAT-06-01, RF-CAT-06-03).
 *  U4  La carta de colores se navega por familia y se busca por nombre o código.
 *  U5  La existencia se muestra solo como disponible / agotado, informativa.
 *  U6  El rendimiento por medida = rendimiento por galón × equivalencia en galones
 *      del tipo de medida (D6), siempre marcado como aproximado; null sin equivalencia.
 *  U7  No se exponen existencias exactas, códigos de proveedor ni ids internos de BD
 *      más allá de lo que la vista necesita (HU-SEG-06).
 *
 * ── Autorización (administración) ───────────────────────────────────────────
 *  Igual que la entrega 1 (D1): GET → catalogo.ver · POST → catalogo.crear ·
 *  PUT → catalogo.editar · PATCH estado: activar → catalogo.editar, desactivar →
 *  catalogo.eliminar. Publicar → catalogo.editar. Importar colores → catalogo.crear.
 *
 * ── Decisiones por defecto (el Tech Lead puede vetarlas) ────────────────────
 *  D7  Con ficha de recubrimiento la línea es obligatoria; sin ficha es opcional.
 *  D8  La familia de color se deriva del hexadecimal cuando no se envía (matiz y
 *      luminosidad); el algoritmo es del servicio. Quien administra puede corregirla.
 *  D9  Sin imágenes en esta entrega: publicar no las exige y las tarjetas llevan
 *      `imagenPrincipalUrl: null` hasta la entrega 3.
 *  D10 La existencia se edita aquí mientras M13 no exista; después, solo por M13.
 *  D11 Las relaciones del producto se reemplazan completas al editarlas.
 *  D12 Los estados `agotado` y `descontinuado` del enum de la BD no se usan.
 *  D13 Un producto puede estar en un solo ambiente o en ambos; no se exige ninguno.
 *
 * Regla de Oro #1: Cero código sin contrato previo.
 * Regla de Oro #11: Tolerancia Cero al tipo `any`.
 * ============================================================================
 */

/* ───────────────────────────────────────────────────────────────────────────
 * 1. PRIMITIVAS
 * ─────────────────────────────────────────────────────────────────────────── */

export const MAXIMO_FILAS_IMPORTACION = 500;
export const MAXIMO_PRECIO = 9_999_999_999.99;

export const codigoColorSchema = z.string().trim().min(1).max(60);
export const skuSchema = z.string().trim().min(1).max(60).regex(/^[A-Za-z0-9._-]+$/, 'Solo letras, números, punto, guion y guion bajo');
export const codigoProveedorSchema = z.string().trim().min(1).max(100);
export const existenciaSchema = z.number().int().min(0).max(2_147_483_647);
export const precioSchema = z
  .number()
  .min(0)
  .max(MAXIMO_PRECIO)
  .refine((v) => Math.round(v * 100) / 100 === v, { message: 'El precio admite máximo dos decimales' });

export const cielabSchema = z.object({
  l: z.number().min(0).max(100),
  a: z.number().min(-128).max(128),
  b: z.number().min(-128).max(128),
});
export type Cielab = z.infer<typeof cielabSchema>;

export const claseColorSchema = z.enum(['entonable', 'colores_fijos', 'sin_color']);
export type ClaseColor = z.infer<typeof claseColorSchema>;

export const disponibilidadSchema = z.enum(['disponible', 'agotado']);
export type Disponibilidad = z.infer<typeof disponibilidadSchema>;

export const ambienteSchema = z.enum(['interior', 'exterior']);
export type Ambiente = z.infer<typeof ambienteSchema>;

const alMenosUnCampo = (v: Record<string, unknown>): boolean =>
  Object.values(v).some((valor) => valor !== undefined);
const MENSAJE_SIN_CAMPOS = { message: 'Debe enviarse al menos un campo' };

/** Booleano en query string ("true"/"false"): z.coerce.boolean() trataría "false" como true. */
const booleanoQuerySchema = z.enum(['true', 'false']).transform((v) => v === 'true');

const sinDuplicados = (ids: number[]): boolean => new Set(ids).size === ids.length;

/* ───────────────────────────────────────────────────────────────────────────
 * 2. COLORES
 * ─────────────────────────────────────────────────────────────────────────── */

export const colorSchema = z.object({
  idColor: idSchema,
  idMarca: idSchema,
  marca: z.string(),
  nombre: z.string(),
  codigo: z.string().nullable(),
  hexadecimal: z.string(),
  idBase: idSchema.nullable(),
  base: z.string().nullable(),
  idAcabado: idSchema,
  acabado: z.string(),
  idFamiliaColor: idSchema.nullable(),
  familia: z.string().nullable(),
  cielab: cielabSchema.nullable(),
  /** C3: color sin base, solo ofrecible como color de fábrica. */
  sinBase: z.boolean(),
  estado: estadoSchema,
});
export type Color = z.infer<typeof colorSchema>;

export const crearColorRequestSchema = z.object({
  idMarca: idSchema,
  nombre: nombreSchema,
  codigo: codigoColorSchema.nullable().optional(),
  hexadecimal: hexadecimalSchema,
  idBase: idSchema.nullable().optional(),
  /** Si se omite, el servidor usa Brillante (C2). */
  idAcabado: idSchema.optional(),
  /** Si se omite, el servidor la deriva del hexadecimal (C4, D8). */
  idFamiliaColor: idSchema.nullable().optional(),
  cielab: cielabSchema.nullable().optional(),
});
export type CrearColorRequest = z.infer<typeof crearColorRequestSchema>;

/** La marca de un color no cambia. */
export const editarColorRequestSchema = z
  .object({
    nombre: nombreSchema.optional(),
    codigo: codigoColorSchema.nullable().optional(),
    hexadecimal: hexadecimalSchema.optional(),
    idBase: idSchema.nullable().optional(),
    idAcabado: idSchema.optional(),
    idFamiliaColor: idSchema.nullable().optional(),
    cielab: cielabSchema.nullable().optional(),
  })
  .refine(alMenosUnCampo, MENSAJE_SIN_CAMPOS);
export type EditarColorRequest = z.infer<typeof editarColorRequestSchema>;

/** GET /colores */
export const listarColoresRequestSchema = paginacionQuerySchema.extend({
  busqueda: z.string().trim().max(100).optional(),
  idMarca: z.coerce.number().int().positive().optional(),
  idFamiliaColor: z.coerce.number().int().positive().optional(),
  idBase: z.coerce.number().int().positive().optional(),
  idAcabado: z.coerce.number().int().positive().optional(),
  sinBase: booleanoQuerySchema.optional(),
  estado: estadoSchema.optional(),
});
export type ListarColoresRequest = z.infer<typeof listarColoresRequestSchema>;

/** Fila de importación (C8): base, acabado y familia por NOMBRE. */
export const filaColorImportacionSchema = z.object({
  nombre: nombreSchema,
  codigo: codigoColorSchema.nullable().optional(),
  hexadecimal: hexadecimalSchema,
  base: nombreCortoSchema.nullable().optional(),
  acabado: nombreCortoSchema.nullable().optional(),
  familia: nombreCortoSchema.nullable().optional(),
});
export type FilaColorImportacion = z.infer<typeof filaColorImportacionSchema>;

/** POST /colores/importar/previsualizar y POST /colores/importar/aplicar */
export const importarColoresRequestSchema = z.object({
  idMarca: idSchema,
  filas: z.array(filaColorImportacionSchema).min(1).max(MAXIMO_FILAS_IMPORTACION),
});
export type ImportarColoresRequest = z.infer<typeof importarColoresRequestSchema>;

export const resultadoFilaImportacionSchema = z.object({
  /** Posición de la fila en el bloque enviado (base 0). */
  indice: z.number().int().nonnegative(),
  resultado: z.enum(['creada', 'actualizada', 'sin_cambios', 'rechazada']),
  idColor: idSchema.nullable(),
  motivoRechazo: z
    .enum([
      'nombre_duplicado_en_bloque',
      'codigo_duplicado',
      'base_no_encontrada',
      'acabado_no_encontrado',
      'familia_no_encontrada',
    ])
    .nullable(),
  /** C3: la fila no trae base; se crea/actualiza como color sin base. */
  sinBase: z.boolean(),
});
export type ResultadoFilaImportacion = z.infer<typeof resultadoFilaImportacionSchema>;

export const balanceImportacionSchema = z.object({
  total: z.number().int().nonnegative(),
  creadas: z.number().int().nonnegative(),
  actualizadas: z.number().int().nonnegative(),
  sinCambios: z.number().int().nonnegative(),
  rechazadas: z.number().int().nonnegative(),
  sinBase: z.number().int().nonnegative(),
});
export type BalanceImportacion = z.infer<typeof balanceImportacionSchema>;

export const importarColoresResponseEnvelopeSchema = respuestaUno(
  z.object({
    aplicada: z.boolean(),
    balance: balanceImportacionSchema,
    filas: z.array(resultadoFilaImportacionSchema),
  }),
);
export type ImportarColoresResponseEnvelope = z.infer<typeof importarColoresResponseEnvelopeSchema>;

export const colorResponseEnvelopeSchema = respuestaUno(colorSchema);
export type ColorResponseEnvelope = z.infer<typeof colorResponseEnvelopeSchema>;
export const listarColoresResponseEnvelopeSchema = respuestaPaginada(colorSchema);
export type ListarColoresResponseEnvelope = z.infer<typeof listarColoresResponseEnvelopeSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 3. PRODUCTOS (administración)
 * ─────────────────────────────────────────────────────────────────────────── */

export const tipoCalidadSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

/** Rendimiento en m² por galón (RF-CAT-10-02, RF-CAT-10-05): mínimo y máximo juntos, mínimo ≤ máximo. */
const rendimientoCompleto = (v: { rendimientoMin?: number | null | undefined; rendimientoMax?: number | null | undefined }): boolean => {
  const min = v.rendimientoMin ?? null;
  const max = v.rendimientoMax ?? null;
  return (min === null && max === null) || (min !== null && max !== null && min <= max);
};
const MENSAJE_RENDIMIENTO = { message: 'El rendimiento exige mínimo y máximo, con mínimo no mayor al máximo' };

export const fichaRecubrimientoRequestSchema = z
  .object({
    idTipoResina: idSchema,
    /** 1 = gama alta (ej. Viniltex Ultralavable). Opcional. */
    tipoCalidad: tipoCalidadSchema.nullable().optional(),
    rendimientoMin: z.number().positive().max(99_999).nullable().optional(),
    rendimientoMax: z.number().positive().max(99_999).nullable().optional(),
  })
  .refine(rendimientoCompleto, MENSAJE_RENDIMIENTO);
export type FichaRecubrimientoRequest = z.infer<typeof fichaRecubrimientoRequestSchema>;

export const caracteristicaRequestSchema = z.object({
  nombre: nombreSchema,
  valor: z.string().trim().min(1).max(255),
  orden: ordenSchema.default(0),
});
export type CaracteristicaRequest = z.infer<typeof caracteristicaRequestSchema>;

const listaIdsSchema = z.array(idSchema).max(500).refine(sinDuplicados, { message: 'Hay ids repetidos' });

/**
 * POST /productos. Las reglas entre campos (P2, P3) se verifican aquí; las que
 * necesitan la base de datos (P1, P6, existencia de los ids) las verifica el servicio.
 */
export const crearProductoRequestSchema = z
  .object({
    idMarca: idSchema,
    idLinea: idSchema.nullable().optional(),
    idSubcategoria: idSchema,
    nombre: z.string().trim().min(1).max(150),
    descripcion: z.string().trim().max(5000).nullable().optional(),
    usoInterior: z.boolean().default(false),
    usoExterior: z.boolean().default(false),
    idCategoriaComplementaria: idSchema.nullable().optional(),
    patrocinado: z.boolean().default(false),
    ficha: fichaRecubrimientoRequestSchema.nullable().optional(),
    idsSuperficies: listaIdsSchema.default([]),
    idsAcabados: listaIdsSchema.default([]),
    idsBases: listaIdsSchema.default([]),
    idsColoresFabrica: listaIdsSchema.default([]),
    caracteristicas: z.array(caracteristicaRequestSchema).max(50).default([]),
  })
  .superRefine((v, ctx) => {
    const conFicha = v.ficha !== null && v.ficha !== undefined;
    if (conFicha && (v.idLinea === null || v.idLinea === undefined)) {
      ctx.addIssue({ code: 'custom', path: ['idLinea'], message: 'Un recubrimiento exige línea' });
    }
    if (!conFicha && (v.idsAcabados.length > 0 || v.idsBases.length > 0 || v.idsColoresFabrica.length > 0)) {
      ctx.addIssue({
        code: 'custom',
        path: ['ficha'],
        message: 'Acabados, bases y colores de fábrica exigen la ficha de recubrimiento',
      });
    }
    if (v.idsBases.length > 0 && v.idsAcabados.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['idsAcabados'],
        message: 'Un producto con bases necesita al menos un acabado',
      });
    }
  });
export type CrearProductoRequest = z.infer<typeof crearProductoRequestSchema>;

/**
 * PUT /productos/:idProducto. La marca no cambia (P1). Cada lista enviada
 * REEMPLAZA a la actual (D11); `ficha: null` retira la ficha. Las reglas P2 y P3
 * se verifican en el servicio contra el estado resultante.
 */
export const editarProductoRequestSchema = z
  .object({
    idLinea: idSchema.nullable().optional(),
    idSubcategoria: idSchema.optional(),
    nombre: z.string().trim().min(1).max(150).optional(),
    descripcion: z.string().trim().max(5000).nullable().optional(),
    usoInterior: z.boolean().optional(),
    usoExterior: z.boolean().optional(),
    idCategoriaComplementaria: idSchema.nullable().optional(),
    patrocinado: z.boolean().optional(),
    ficha: fichaRecubrimientoRequestSchema.nullable().optional(),
    idsSuperficies: listaIdsSchema.optional(),
    idsAcabados: listaIdsSchema.optional(),
    idsBases: listaIdsSchema.optional(),
    idsColoresFabrica: listaIdsSchema.optional(),
    caracteristicas: z.array(caracteristicaRequestSchema).max(50).optional(),
  })
  .refine(alMenosUnCampo, MENSAJE_SIN_CAMPOS);
export type EditarProductoRequest = z.infer<typeof editarProductoRequestSchema>;

/** PATCH /productos/:idProducto/publicacion (P7) */
export const publicarProductoRequestSchema = z.object({ publicado: z.boolean() });
export type PublicarProductoRequest = z.infer<typeof publicarProductoRequestSchema>;

/** PATCH /productos/:idProducto/estado y /variantes/:idVariante/estado (P8, P9, P10) */
export const cambiarEstadoProductoRequestSchema = z.object({
  estado: estadoSchema,
  confirmar: z.boolean().default(false),
});
export type CambiarEstadoProductoRequest = z.infer<typeof cambiarEstadoProductoRequestSchema>;

/** GET /productos */
export const listarProductosRequestSchema = paginacionQuerySchema.extend({
  busqueda: z.string().trim().max(100).optional(),
  idMarca: z.coerce.number().int().positive().optional(),
  idLinea: z.coerce.number().int().positive().optional(),
  idSubcategoria: z.coerce.number().int().positive().optional(),
  claseColor: claseColorSchema.optional(),
  estado: estadoSchema.optional(),
  publicado: booleanoQuerySchema.optional(),
});
export type ListarProductosRequest = z.infer<typeof listarProductosRequestSchema>;

export const referenciaSchema = z.object({ id: idSchema, nombre: z.string() });
export type Referencia = z.infer<typeof referenciaSchema>;

export const fichaRecubrimientoSchema = z.object({
  idTipoResina: idSchema,
  tipoResina: z.string(),
  tipoCalidad: tipoCalidadSchema.nullable(),
  /** m² por galón (RF-CAT-10-02). */
  rendimientoMin: z.number().nullable(),
  rendimientoMax: z.number().nullable(),
});
export type FichaRecubrimiento = z.infer<typeof fichaRecubrimientoSchema>;

export const caracteristicaSchema = z.object({
  nombre: z.string(),
  valor: z.string(),
  orden: ordenSchema,
});
export type Caracteristica = z.infer<typeof caracteristicaSchema>;

/** Variante (administración). */
export const varianteSchema = z.object({
  idVariante: idSchema,
  idProducto: idSchema,
  idMedida: idSchema,
  medida: z.string(),
  tipoMedida: z.string(),
  sku: z.string(),
  precio: z.number().nonnegative(),
  existenciaReferencial: existenciaSchema,
  codigoProveedor: z.string().nullable(),
  estado: estadoSchema,
});
export type Variante = z.infer<typeof varianteSchema>;

export const productoResumenSchema = z.object({
  idProducto: idSchema,
  nombre: z.string(),
  idMarca: idSchema,
  marca: z.string(),
  idLinea: idSchema.nullable(),
  linea: z.string().nullable(),
  idSubcategoria: idSchema,
  subcategoria: z.string(),
  categoria: z.string(),
  usoInterior: z.boolean(),
  usoExterior: z.boolean(),
  /** P4: derivada. */
  claseColor: claseColorSchema,
  estado: estadoSchema,
  publicado: z.boolean(),
  patrocinado: z.boolean(),
  variantesActivas: z.number().int().nonnegative(),
});
export type ProductoResumen = z.infer<typeof productoResumenSchema>;

export const productoDetalleSchema = productoResumenSchema.extend({
  descripcion: z.string().nullable(),
  idCategoriaComplementaria: idSchema.nullable(),
  ficha: fichaRecubrimientoSchema.nullable(),
  superficies: z.array(referenciaSchema),
  acabados: z.array(referenciaSchema),
  bases: z.array(referenciaSchema),
  coloresFabrica: z.array(referenciaSchema),
  caracteristicas: z.array(caracteristicaSchema),
  variantes: z.array(varianteSchema),
});
export type ProductoDetalle = z.infer<typeof productoDetalleSchema>;

export const productoResponseEnvelopeSchema = respuestaUno(productoDetalleSchema);
export type ProductoResponseEnvelope = z.infer<typeof productoResponseEnvelopeSchema>;
export const listarProductosResponseEnvelopeSchema = respuestaPaginada(productoResumenSchema);
export type ListarProductosResponseEnvelope = z.infer<typeof listarProductosResponseEnvelopeSchema>;

/** GET /productos/:idProducto/impacto-desactivacion y de variantes: reutiliza el de la entrega 1. */
export const impactoProductoResponseEnvelopeSchema = respuestaUno(impactoDesactivacionSchema);
export type ImpactoProductoResponseEnvelope = z.infer<typeof impactoProductoResponseEnvelopeSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 4. VARIANTES (administración)
 * ─────────────────────────────────────────────────────────────────────────── */

/** POST /productos/:idProducto/variantes (V1, V3, V4, V5) */
export const crearVarianteRequestSchema = z.object({
  idMedida: idSchema,
  precio: precioSchema,
  sku: skuSchema.optional(),
  existenciaReferencial: existenciaSchema.default(0),
  codigoProveedor: codigoProveedorSchema.nullable().optional(),
});
export type CrearVarianteRequest = z.infer<typeof crearVarianteRequestSchema>;

/** PUT /variantes/:idVariante — la medida no cambia (V5). */
export const editarVarianteRequestSchema = z
  .object({
    precio: precioSchema.optional(),
    sku: skuSchema.optional(),
    existenciaReferencial: existenciaSchema.optional(),
    codigoProveedor: codigoProveedorSchema.nullable().optional(),
  })
  .refine(alMenosUnCampo, MENSAJE_SIN_CAMPOS);
export type EditarVarianteRequest = z.infer<typeof editarVarianteRequestSchema>;

export const varianteResponseEnvelopeSchema = respuestaUno(varianteSchema);
export type VarianteResponseEnvelope = z.infer<typeof varianteResponseEnvelopeSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 5. COLORES QUE OFRECE UN PRODUCTO (P5) — administración y público
 * ─────────────────────────────────────────────────────────────────────────── */

/** GET /productos/:idProducto/colores */
export const listarColoresProductoRequestSchema = paginacionQuerySchema.extend({
  busqueda: z.string().trim().max(100).optional(),
  idFamiliaColor: z.coerce.number().int().positive().optional(),
  idAcabado: z.coerce.number().int().positive().optional(),
});
export type ListarColoresProductoRequest = z.infer<typeof listarColoresProductoRequestSchema>;

export const colorOfrecidoSchema = z.object({
  idColor: idSchema,
  nombre: z.string(),
  codigo: z.string().nullable(),
  hexadecimal: z.string(),
  idFamiliaColor: idSchema.nullable(),
  familia: z.string().nullable(),
  idAcabado: idSchema,
  acabado: z.string(),
  /** Color propio del producto (ICO, aerosoles, transparente, exclusivos). */
  esDeFabrica: z.boolean(),
});
export type ColorOfrecido = z.infer<typeof colorOfrecidoSchema>;

/** Familias presentes en la carta del producto, para el selector por matriz (U4). */
export const familiaDisponibleSchema = z.object({
  idFamiliaColor: idSchema,
  nombre: z.string(),
  hexadecimal: z.string(),
  total: z.number().int().nonnegative(),
});
export type FamiliaDisponible = z.infer<typeof familiaDisponibleSchema>;

export const coloresProductoResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.array(colorOfrecidoSchema),
  pagination: paginacionSchema,
  familias: z.array(familiaDisponibleSchema),
});
export type ColoresProductoResponseEnvelope = z.infer<typeof coloresProductoResponseEnvelopeSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 6. CONSULTA PÚBLICA (U1–U7) — sin autenticación
 * ─────────────────────────────────────────────────────────────────────────── */

export const subcategoriaPublicaSchema = z.object({
  idSubcategoria: idSchema,
  nombre: z.string(),
  totalProductos: z.number().int().positive(),
});
export const categoriaPublicaSchema = z.object({
  idCategoria: idSchema,
  nombre: z.string(),
  subcategorias: z.array(subcategoriaPublicaSchema),
});
export type CategoriaPublica = z.infer<typeof categoriaPublicaSchema>;
export const categoriasPublicasResponseEnvelopeSchema = respuestaLista(categoriaPublicaSchema);
export type CategoriasPublicasResponseEnvelope = z.infer<typeof categoriasPublicasResponseEnvelopeSchema>;

/** Opciones de filtro para la vitrina. */
export const filtrosPublicosSchema = z.object({
  marcas: z.array(referenciaSchema),
  superficies: z.array(referenciaSchema),
  ambientes: z.array(ambienteSchema),
});
export type FiltrosPublicos = z.infer<typeof filtrosPublicosSchema>;
export const filtrosPublicosResponseEnvelopeSchema = respuestaUno(filtrosPublicosSchema);
export type FiltrosPublicosResponseEnvelope = z.infer<typeof filtrosPublicosResponseEnvelopeSchema>;

/** GET /catalogo/productos */
export const listarProductosPublicosRequestSchema = paginacionQuerySchema.extend({
  busqueda: z.string().trim().max(100).optional(),
  idCategoria: z.coerce.number().int().positive().optional(),
  idSubcategoria: z.coerce.number().int().positive().optional(),
  idSuperficie: z.coerce.number().int().positive().optional(),
  ambiente: ambienteSchema.optional(),
  idMarca: z.coerce.number().int().positive().optional(),
  idLinea: z.coerce.number().int().positive().optional(),
  ordenar: z.enum(['nombre', 'precio_asc', 'precio_desc']).default('nombre'),
});
export type ListarProductosPublicosRequest = z.infer<typeof listarProductosPublicosRequestSchema>;

export const productoPublicoTarjetaSchema = z.object({
  idProducto: idSchema,
  nombre: z.string(),
  marca: z.string(),
  linea: z.string().nullable(),
  categoria: z.string(),
  subcategoria: z.string(),
  /** Mínimo de sus variantes activas (U5: "desde"). */
  precioDesde: z.number().nonnegative().nullable(),
  tieneColor: z.boolean(),
  disponibilidad: disponibilidadSchema,
  /** Siempre null hasta la entrega 3 (D9). */
  imagenPrincipalUrl: z.string().nullable(),
});
export type ProductoPublicoTarjeta = z.infer<typeof productoPublicoTarjetaSchema>;
export const listarProductosPublicosResponseEnvelopeSchema = respuestaPaginada(productoPublicoTarjetaSchema);
export type ListarProductosPublicosResponseEnvelope = z.infer<typeof listarProductosPublicosResponseEnvelopeSchema>;

/** Rendimiento aproximado de una medida (U6). */
export const rendimientoAproximadoSchema = z.object({
  min: z.number().positive(),
  max: z.number().positive(),
  aproximado: z.literal(true),
});
export type RendimientoAproximado = z.infer<typeof rendimientoAproximadoSchema>;

export const variantePublicaSchema = z.object({
  idVariante: idSchema,
  idMedida: idSchema,
  medida: z.string(),
  tipoMedida: z.string(),
  sku: z.string(),
  precio: z.number().nonnegative(),
  disponibilidad: disponibilidadSchema,
  rendimiento: rendimientoAproximadoSchema.nullable(),
});
export type VariantePublica = z.infer<typeof variantePublicaSchema>;

export const productoPublicoFichaSchema = z.object({
  idProducto: idSchema,
  nombre: z.string(),
  descripcion: z.string().nullable(),
  marca: z.string(),
  linea: z.string().nullable(),
  categoria: z.string(),
  subcategoria: z.string(),
  usoInterior: z.boolean(),
  usoExterior: z.boolean(),
  claseColor: claseColorSchema,
  tipoResina: z.string().nullable(),
  tipoCalidad: tipoCalidadSchema.nullable(),
  superficies: z.array(z.string()),
  acabados: z.array(referenciaSchema),
  caracteristicas: z.array(caracteristicaSchema),
  variantes: z.array(variantePublicaSchema),
  imagenPrincipalUrl: z.string().nullable(),
});
export type ProductoPublicoFicha = z.infer<typeof productoPublicoFichaSchema>;
export const productoPublicoResponseEnvelopeSchema = respuestaUno(productoPublicoFichaSchema);
export type ProductoPublicoResponseEnvelope = z.infer<typeof productoPublicoResponseEnvelopeSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 7. ERRORES
 * ─────────────────────────────────────────────────────────────────────────── */

/**
 * Mismo envelope global que la entrega 1. Estados HTTP: 400 PARAMETRO_INVALIDO · 404 RECURSO_NO_DISPONIBLE
 * (también toda denegación y toda ficha pública no disponible) · 409 DUPLICADO, RELACION_INVALIDA,
 * PADRE_INACTIVO, CONFIRMACION_REQUERIDA, NO_PUBLICABLE.
 */
export const CODIGOS_ERROR_PRODUCTOS = [
  'PARAMETRO_INVALIDO',
  'RECURSO_NO_DISPONIBLE',
  'DUPLICADO',
  'RELACION_INVALIDA',
  'PADRE_INACTIVO',
  'CONFIRMACION_REQUERIDA',
  'NO_PUBLICABLE',
] as const;

export const errorProductosEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.enum(CODIGOS_ERROR_PRODUCTOS),
    message: z.string(),
    /** CONFIRMACION_REQUERIDA → el impacto; DUPLICADO y RELACION_INVALIDA → el campo; resto → null. */
    details: z.union([impactoDesactivacionSchema, z.object({ campo: z.string() })]).nullable(),
  }),
});
export type ErrorProductosEnvelope = z.infer<typeof errorProductosEnvelopeSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 8. MAPA DE RUTAS
 * ───────────────────────────────────────────────────────────────────────────
 *  ADMINISTRACIÓN (montaje: /api/v1/admin/catalogo) — permisos como la entrega 1
 *
 *  Colores
 *  GET /colores · POST /colores · GET /colores/:idColor · PUT /colores/:idColor
 *  PATCH /colores/:idColor/estado · GET /colores/:idColor/impacto-desactivacion
 *  POST /colores/importar/previsualizar · POST /colores/importar/aplicar
 *
 *  Productos
 *  GET /productos · POST /productos · GET /productos/:idProducto
 *  PUT /productos/:idProducto
 *  PATCH /productos/:idProducto/estado · PATCH /productos/:idProducto/publicacion
 *  GET /productos/:idProducto/impacto-desactivacion
 *  GET /productos/:idProducto/colores                      (P5, paginado)
 *
 *  Variantes
 *  POST /productos/:idProducto/variantes
 *  PUT /variantes/:idVariante · PATCH /variantes/:idVariante/estado
 *  GET /variantes/:idVariante/impacto-desactivacion
 *
 *  PÚBLICO (montaje: /api/v1/catalogo) — sin autenticación, solo lectura
 *  GET /categorias               árbol con productos visibles (U2)
 *  GET /filtros                  marcas, superficies y ambientes
 *  GET /productos                tarjetas paginadas con filtros
 *  GET /productos/:idProducto    ficha con variantes (404 si no está disponible, U1)
 *  GET /productos/:idProducto/colores   carta paginada por familia (U3, U4)
 *  GET /marcas/:idMarca/logotipo bytes del logotipo
 * ─────────────────────────────────────────────────────────────────────────── */
