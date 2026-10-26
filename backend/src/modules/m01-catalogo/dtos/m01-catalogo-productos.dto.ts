import { z } from 'zod';

/**
 * Espejo fiel de `contracts/m01-catalogo-productos.contract.ts` para ejecución en el backend
 * (el contrato vive fuera de `backend/src`). NO editar aquí: se cambia el contrato y
 * se copia. `m01-catalogo.contrato-espejo.test.ts` falla si ambos difieren.
 */
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
  LOGOTIPO_MAXIMO_BASE64,
  tipoMimeLogotipoSchema,
  medidaSchema,
} from './m01-catalogo.dto';



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
    /** Manos con las que se logra el rendimiento ("35 m² por galón a 2 manos"). Exige rendimiento. */
    manos: z.number().int().min(1).max(10).nullable().optional(),
  })
  .refine(rendimientoCompleto, MENSAJE_RENDIMIENTO)
  .refine((v) => (v.manos ?? null) === null || ((v.rendimientoMin ?? null) !== null && (v.rendimientoMax ?? null) !== null), {
    message: 'Las manos se indican junto con el rendimiento',
  });
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
  /** Entrega 3: true = solo combos; false = sin combos; sin enviar = todos. */
  esCombo: booleanoQuerySchema.optional(),
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
  manos: z.number().int().nullable(),
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
  /** Entrega 3 (K1, K4). */
  esCombo: z.boolean(),
  excluidoDeDescuentos: z.boolean(),
  variantesActivas: z.number().int().nonnegative(),
});
export type ProductoResumen = z.infer<typeof productoResumenSchema>;

export const MAXIMO_IMAGENES_PRODUCTO = 12;

/** POST /productos/:idProducto/imagenes y PUT /medidas/:idMedida/imagen (I1, I4) */
export const subirImagenRequestSchema = z.object({
  imagenBase64: z.string().min(1, 'Elija una imagen').max(LOGOTIPO_MAXIMO_BASE64, 'La imagen no puede superar 5 MB'),
  imagenMimeType: tipoMimeLogotipoSchema,
});
export type SubirImagenRequest = z.infer<typeof subirImagenRequestSchema>;

/** Los bytes se piden aparte: GET /imagenes/:idImagen. */
export const imagenProductoSchema = z.object({
  idImagen: idSchema,
  orden: z.number().int().nonnegative(),
  esPrincipal: z.boolean(),
  mimeType: tipoMimeLogotipoSchema,
  /** Entrega 3 (I5): a lo sumo una de las dos; null en ambas = imagen general del producto. */
  idVariante: idSchema.nullable(),
  idColor: idSchema.nullable(),
});
export type ImagenProducto = z.infer<typeof imagenProductoSchema>;

/** PATCH /productos/:idProducto/imagenes/orden (I3) */
export const ordenarImagenesRequestSchema = z.object({
  idsOrdenados: z
    .array(idSchema)
    .min(1)
    .max(MAXIMO_IMAGENES_PRODUCTO)
    .refine((ids) => new Set(ids).size === ids.length, { message: 'Hay ids repetidos' }),
});
export type OrdenarImagenesRequest = z.infer<typeof ordenarImagenesRequestSchema>;

export const imagenResponseEnvelopeSchema = respuestaUno(imagenProductoSchema);
export type ImagenResponseEnvelope = z.infer<typeof imagenResponseEnvelopeSchema>;
export const imagenesResponseEnvelopeSchema = respuestaLista(imagenProductoSchema);
export type ImagenesResponseEnvelope = z.infer<typeof imagenesResponseEnvelopeSchema>;
export const medidaImagenResponseEnvelopeSchema = respuestaUno(medidaSchema);
export type MedidaImagenResponseEnvelope = z.infer<typeof medidaImagenResponseEnvelopeSchema>;

export const productoDetalleSchema = productoResumenSchema.extend({
  descripcion: z.string().nullable(),
  idCategoriaComplementaria: idSchema.nullable(),
  ficha: fichaRecubrimientoSchema.nullable(),
  superficies: z.array(referenciaSchema),
  acabados: z.array(referenciaSchema),
  bases: z.array(referenciaSchema),
  coloresFabrica: z.array(referenciaSchema),
  caracteristicas: z.array(caracteristicaSchema),
  imagenes: z.array(imagenProductoSchema),
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
  codigoProveedor: codigoProveedorSchema.nullable().optional(),
});
export type CrearVarianteRequest = z.infer<typeof crearVarianteRequestSchema>;

/** PUT /variantes/:idVariante — la medida no cambia (V5). */
export const editarVarianteRequestSchema = z
  .object({
    precio: precioSchema.optional(),
    sku: skuSchema.optional(),
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
  /** true = solo los productos con una oferta en curso (pestaña Promociones). */
  enOferta: booleanoQuerySchema.optional(),
});
export type ListarProductosPublicosRequest = z.infer<typeof listarProductosPublicosRequestSchema>;

/**
 * Oferta de un evento de M06 que está en curso (la etiqueta "−15 %" y el precio tachado). El descuento de las
 * cuentas empresa NUNCA aparece aquí: depende del total del carrito y solo se ve en el carrito.
 */
export const ofertaPublicaSchema = z.object({
  /** Nombre del evento, tal como se muestra al cliente. */
  nombre: z.string(),
  /** La etiqueta de la tarjeta. */
  porcentaje: z.number().gt(0).max(100),
  /** Precio unitario sin la oferta (el que se tacha), IVA incluido. */
  precioAntes: z.number().nonnegative(),
  /** Precio unitario con la oferta, IVA incluido. */
  precioConOferta: z.number().nonnegative(),
});
export type OfertaPublica = z.infer<typeof ofertaPublicaSchema>;

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
  /** GET /catalogo/imagenes/:idImagen?tamano=miniatura */
  idImagenPrincipal: idSchema.nullable(),
  /** Entrega 3: combo; y `compraBloqueada` = combo agotado (se ve, no se compra, K5). */
  esCombo: z.boolean(),
  compraBloqueada: z.boolean(),
  /**
   * Oferta en curso de la variante en oferta de menor precio (D5 de M06); null si el producto no está en oferta.
   * `precioDesde` sigue siendo el mínimo de las variantes sin oferta.
   */
  oferta: ofertaPublicaSchema.nullable(),
});
export type ProductoPublicoTarjeta = z.infer<typeof productoPublicoTarjetaSchema>;

/** Elemento de la galería de la ficha pública. */
export const imagenPublicaSchema = z.object({
  idImagen: idSchema,
  idVariante: idSchema.nullable(),
  idColor: idSchema.nullable(),
});
export type ImagenPublica = z.infer<typeof imagenPublicaSchema>;
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
  /** Entrega 3 (K5): true cuando es un combo sin existencia. */
  compraBloqueada: z.boolean(),
  /** Oferta en curso de esta variante, sin elegir color (con color, ver `GET /productos/:id/ofertas`). */
  oferta: ofertaPublicaSchema.nullable(),
  rendimiento: rendimientoAproximadoSchema.nullable(),
  /** GET /catalogo/medidas/:idMedida/imagen */
  tieneImagenMedida: z.boolean(),
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
  /** Manos con las que se logra el rendimiento de la ficha. */
  manos: z.number().int().nullable(),
  superficies: z.array(z.string()),
  acabados: z.array(referenciaSchema),
  caracteristicas: z.array(caracteristicaSchema),
  variantes: z.array(variantePublicaSchema),
  /** Entrega 3: combo; `compraBloqueada` = combo agotado. */
  esCombo: z.boolean(),
  compraBloqueada: z.boolean(),
  /**
   * Galería en orden; la primera es la principal. Cada imagen puede pertenecer a una variante o a un
   * color (I6). GET /catalogo/imagenes/:idImagen?tamano=mediana
   */
  imagenes: z.array(imagenPublicaSchema),
});
export type ProductoPublicoFicha = z.infer<typeof productoPublicoFichaSchema>;
export const productoPublicoResponseEnvelopeSchema = respuestaUno(productoPublicoFichaSchema);
export type ProductoPublicoResponseEnvelope = z.infer<typeof productoPublicoResponseEnvelopeSchema>;

/**
 * GET /catalogo/productos/:idProducto/ofertas?idColor= — la oferta de cada variante CON el color elegido, porque las
 * excepciones por color (p. ej. "el blanco no entra") solo se pueden evaluar sabiendo el color (R8 de M06).
 */
export const ofertasProductoRequestSchema = z.object({
  idColor: z.coerce.number().int().positive().optional(),
});
export type OfertasProductoRequest = z.infer<typeof ofertasProductoRequestSchema>;

export const ofertaVarianteSchema = z.object({
  idVariante: idSchema,
  oferta: ofertaPublicaSchema.nullable(),
});
export type OfertaVariante = z.infer<typeof ofertaVarianteSchema>;
export const ofertasProductoResponseEnvelopeSchema = respuestaLista(ofertaVarianteSchema);
export type OfertasProductoResponseEnvelope = z.infer<typeof ofertasProductoResponseEnvelopeSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 7. ERRORES
 * ─────────────────────────────────────────────────────────────────────────── */

/**
 * Mismo envelope global que la entrega 1. Estados HTTP: 400 PARAMETRO_INVALIDO · 404 RECURSO_NO_DISPONIBLE
 * (también toda denegación y toda ficha pública no disponible) · 409 DUPLICADO, RELACION_INVALIDA,
 * PADRE_INACTIVO, CONFIRMACION_REQUERIDA, NO_PUBLICABLE, LIMITE_IMAGENES · 400 IMAGEN_INVALIDA.
 */
export const CODIGOS_ERROR_PRODUCTOS = [
  'PARAMETRO_INVALIDO',
  'RECURSO_NO_DISPONIBLE',
  'DUPLICADO',
  'RELACION_INVALIDA',
  'PADRE_INACTIVO',
  'CONFIRMACION_REQUERIDA',
  'NO_PUBLICABLE',
  'IMAGEN_INVALIDA',
  'LIMITE_IMAGENES',
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
 *  Imágenes (POST y PUT/DELETE de medidas con límite JSON de 7 MB)
 *  GET /productos/:idProducto/imagenes · POST /productos/:idProducto/imagenes
 *  PATCH /productos/:idProducto/imagenes/orden
 *  GET /imagenes/:idImagen (bytes) · PATCH /imagenes/:idImagen/principal · DELETE /imagenes/:idImagen
 *  GET /medidas/:idMedida/imagen (bytes) · PUT /medidas/:idMedida/imagen · DELETE /medidas/:idMedida/imagen
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
 *  GET /productos/:idProducto/ofertas   oferta de cada variante con el color elegido (M06)
 *  GET /marcas/:idMarca/logotipo bytes del logotipo
 *  GET /imagenes/:idImagen       bytes de una imagen de producto visible
 *  GET /medidas/:idMedida/imagen bytes de la imagen de una medida
 * ─────────────────────────────────────────────────────────────────────────── */
