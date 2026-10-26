import { z } from 'zod';

/**
 * Espejo fiel de `contracts/m01-catalogo-entrega3.contract.ts` para ejecución en el backend
 * (el contrato vive fuera de `backend/src`). NO editar aquí: se cambia el contrato y
 * se copia. `m01-catalogo.contrato-espejo.test.ts` falla si ambos difieren.
 */
import {
  estadoSchema,
  hexadecimalSchema,
  idSchema,
  paginacionQuerySchema,
  respuestaLista,
  respuestaPaginada,
  respuestaUno,
} from './m01-catalogo.dto';
import {
  disponibilidadSchema,
  existenciaSchema,
  imagenProductoSchema,
  precioSchema,
  productoPublicoTarjetaSchema,
  skuSchema,
  subirImagenRequestSchema,
} from './m01-catalogo-productos.dto';



/* ───────────────────────────────────────────────────────────────────────────
 * 1. PRIMITIVAS
 * ─────────────────────────────────────────────────────────────────────────── */

export const MAXIMO_COMPLEMENTARIOS = 4;
export const MAXIMO_LINEAS_CONSULTA = 100;
export const TAMANO_MINIATURA_PX = 320;
export const TAMANO_MEDIANA_PX = 960;

/** GET /catalogo/imagenes/:idImagen?tamano=… (I7). Sin parámetro se entrega el original. */
export const tamanoImagenSchema = z.enum(['miniatura', 'mediana', 'original']);
export type TamanoImagen = z.infer<typeof tamanoImagenSchema>;
export const tamanoImagenQuerySchema = z.object({ tamano: tamanoImagenSchema.default('original') });

/* ───────────────────────────────────────────────────────────────────────────
 * 2. COMBOS (administración, /api/v1/admin/catalogo)
 * ─────────────────────────────────────────────────────────────────────────── */

export const comboSchema = z.object({
  idProducto: idSchema,
  /** La única variante del combo (K2). */
  idVariante: idSchema,
  nombre: z.string(),
  descripcion: z.string().nullable(),
  idMarca: idSchema,
  marca: z.string(),
  idSubcategoria: idSchema,
  subcategoria: z.string(),
  idCategoriaComplementaria: idSchema.nullable(),
  patrocinado: z.boolean(),
  excluidoDeDescuentos: z.boolean(),
  idMedida: idSchema,
  medida: z.string(),
  sku: z.string(),
  precio: z.number().nonnegative(),
  /** Solo lectura aquí: se ajusta en M13 (K7, D4). */
  existenciaReferencial: existenciaSchema,
  disponibilidad: disponibilidadSchema,
  estado: estadoSchema,
  publicado: z.boolean(),
  cantidadImagenes: z.number().int().nonnegative(),
});
export type Combo = z.infer<typeof comboSchema>;

/** POST /combos — crea el producto y su única variante en una transacción (K1, K2, K3). */
export const crearComboRequestSchema = z.object({
  idMarca: idSchema,
  idSubcategoria: idSchema,
  nombre: z.string().trim().min(1).max(150),
  descripcion: z.string().trim().max(5000).nullable().optional(),
  /** Debe ser de un tipo de medida "Unidad" (si no, 409 RELACION_INVALIDA, campo idMedida). */
  idMedida: idSchema,
  precio: precioSchema,
  /** Si no se envía se genera `P{idProducto}-V{idVariante}`, como en cualquier variante. */
  sku: skuSchema.optional(),
  excluidoDeDescuentos: z.boolean().default(false),
  patrocinado: z.boolean().default(false),
  idCategoriaComplementaria: idSchema.nullable().optional(),
});
export type CrearComboRequest = z.infer<typeof crearComboRequestSchema>;

const alMenosUnCampo = (v: Record<string, unknown>): boolean => Object.values(v).some((valor) => valor !== undefined);

/** PUT /combos/:idProducto — la marca y la medida no cambian. */
export const editarComboRequestSchema = z
  .object({
    idSubcategoria: idSchema.optional(),
    nombre: z.string().trim().min(1).max(150).optional(),
    descripcion: z.string().trim().max(5000).nullable().optional(),
    precio: precioSchema.optional(),
    sku: skuSchema.optional(),
    excluidoDeDescuentos: z.boolean().optional(),
    patrocinado: z.boolean().optional(),
    idCategoriaComplementaria: idSchema.nullable().optional(),
  })
  .refine(alMenosUnCampo, { message: 'Debe enviarse al menos un campo' });
export type EditarComboRequest = z.infer<typeof editarComboRequestSchema>;

/** GET /combos */
export const listarCombosRequestSchema = paginacionQuerySchema.extend({
  busqueda: z.string().trim().max(100).optional(),
  estado: estadoSchema.optional(),
  disponibilidad: disponibilidadSchema.optional(),
});
export type ListarCombosRequest = z.infer<typeof listarCombosRequestSchema>;

export const comboResponseEnvelopeSchema = respuestaUno(comboSchema);
export type ComboResponseEnvelope = z.infer<typeof comboResponseEnvelopeSchema>;
export const listarCombosResponseEnvelopeSchema = respuestaPaginada(comboSchema);
export type ListarCombosResponseEnvelope = z.infer<typeof listarCombosResponseEnvelopeSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 3. COMPLEMENTARIOS (público, /api/v1/catalogo)
 * ─────────────────────────────────────────────────────────────────────────── */

/**
 * Una sugerencia de la ficha: la tarjeta del listado más la marca de patrocinio (M14 · A9: la pantalla pone la etiqueta
 * «Patrocinado» y mide). `idCampania` es la campaña de M14 que la puso primero; null si no la puso ninguna.
 */
export const complementarioSchema = productoPublicoTarjetaSchema.extend({
  patrocinado: z.boolean(),
  idCampania: idSchema.nullable(),
});
export type Complementario = z.infer<typeof complementarioSchema>;

/** GET /productos/:idProducto/complementarios — hasta 4 tarjetas, las del listado más la marca de patrocinio (X1–X4). */
export const listarComplementariosResponseEnvelopeSchema = respuestaLista(complementarioSchema);
export type ListarComplementariosResponseEnvelope = z.infer<typeof listarComplementariosResponseEnvelopeSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 4. IMÁGENES POR VARIANTE O COLOR (I5, I6)
 * ─────────────────────────────────────────────────────────────────────────── */

const asociacionImagenSchema = z
  .object({
    idVariante: idSchema.nullable().optional(),
    idColor: idSchema.nullable().optional(),
  })
  .refine((v) => !(v.idVariante != null && v.idColor != null), {
    message: 'Una imagen se asocia a una variante o a un color, no a ambos',
  });

/** POST /productos/:idProducto/imagenes — ahora admite la asociación opcional (I5). */
export const subirImagenAsociadaRequestSchema = subirImagenRequestSchema.and(asociacionImagenSchema);
export type SubirImagenAsociadaRequest = z.infer<typeof subirImagenAsociadaRequestSchema>;

/** PATCH /imagenes/:idImagen/asociacion — `null` en ambos la vuelve a dejar general del producto. */
export const cambiarAsociacionImagenRequestSchema = z
  .object({
    idVariante: idSchema.nullable(),
    idColor: idSchema.nullable(),
  })
  .refine((v) => !(v.idVariante !== null && v.idColor !== null), {
    message: 'Una imagen se asocia a una variante o a un color, no a ambos',
  });
export type CambiarAsociacionImagenRequest = z.infer<typeof cambiarAsociacionImagenRequestSchema>;

export const imagenAsociadaResponseEnvelopeSchema = respuestaUno(imagenProductoSchema);
export const imagenesAsociadasResponseEnvelopeSchema = respuestaLista(imagenProductoSchema);

/* ───────────────────────────────────────────────────────────────────────────
 * 5. AMPLIACIONES A LAS ENTREGAS 1 Y 2 (ya aplicadas en sus contratos)
 * ───────────────────────────────────────────────────────────────────────────
 * Se aplican en los contratos de esas entregas (y en sus espejos); aquí queda el resumen.
 *
 *  Administración — productoResumen y productoDetalle ganan:
 *    esCombo: boolean · excluidoDeDescuentos: boolean
 *  Administración — GET /productos gana el filtro esCombo=true|false (por defecto: todos).
 *  Público — productoPublicoTarjeta, variantePublica y productoPublicoFicha ganan:
 *    esCombo: boolean · compraBloqueada: boolean   (true = combo agotado: se ve, no se compra)
 *  Administración — imagenProducto gana idVariante e idColor.
 *  Público — productoPublicoFicha.imagenes pasa de `{ idImagen }` a imagenPublicaSchema.
 *  Entrega 1 — subcategoría (crear, editar y respuesta) gana
 *    idCategoriaComplementaria: id | null  (D6).
 * ─────────────────────────────────────────────────────────────────────────── */

/* ───────────────────────────────────────────────────────────────────────────
 * 6. PUERTO CatalogoParaCompraPort (lo implementa M01; lo consumen M05, M07, M08, M06, M21)
 * ─────────────────────────────────────────────────────────────────────────── */

export const lineaConsultaCompraSchema = z.object({
  idVariante: idSchema,
  /** El color que el cliente eligió (carta de un entonable o color fijo); null si el producto no tiene color. */
  idColor: idSchema.nullable().optional(),
});
export type LineaConsultaCompra = z.infer<typeof lineaConsultaCompraSchema>;

export const motivoNoVendibleSchema = z.enum([
  'variante_no_existe',
  'variante_inactiva',
  'producto_no_disponible',
  'color_no_ofrecido',
  'combo_agotado',
]);
export type MotivoNoVendible = z.infer<typeof motivoNoVendibleSchema>;

export const lineaParaCompraSchema = z.object({
  idVariante: idSchema,
  idColor: idSchema.nullable(),
  /** Null cuando la variante no existe: no hay nada más que informar. */
  idProducto: idSchema.nullable(),
  vendible: z.boolean(),
  motivoNoVendible: motivoNoVendibleSchema.nullable(),
  esCombo: z.boolean(),
  /** P4: solo combos. Null = sin tope (la venta no se limita por existencia). */
  topeUnidades: existenciaSchema.nullable(),
  /** P3: precio base de la variante. */
  precioBase: z.number().nonnegative().nullable(),
  excluidoDeDescuentos: z.boolean(),
  disponibilidad: disponibilidadSchema.nullable(),
  /** P5: lo que M08 copia a la línea de la orden. El color se informa si existe, aunque el producto ya no lo ofrezca
   * (así el carrito puede avisar qué color dejó de estar disponible); null si no hay color o no existe. */
  nombreProducto: z.string().nullable(),
  marca: z.string().nullable(),
  medida: z.string().nullable(),
  sku: z.string().nullable(),
  color: z
    .object({
      idColor: idSchema,
      nombre: z.string(),
      codigo: z.string().nullable(),
      hexadecimal: hexadecimalSchema,
    })
    .nullable(),
  idImagenPrincipal: idSchema.nullable(),
});
export type LineaParaCompra = z.infer<typeof lineaParaCompraSchema>;

/**
 * Devuelve una respuesta por cada consulta, en el mismo orden (hasta MAXIMO_LINEAS_CONSULTA).
 * Nunca lanza por una línea no vendible: la marca con `vendible: false` y su motivo.
 */
export interface CatalogoParaCompraPort {
  consultarLineas(consultas: readonly LineaConsultaCompra[]): Promise<LineaParaCompra[]>;
}

/* ───────────────────────────────────────────────────────────────────────────
 * 7. PUERTO ExistenciaComboPort (lo implementa M13; lo invoca M08 al crear y cancelar la orden)
 * ─────────────────────────────────────────────────────────────────────────── */

export const referenciaMovimientoSchema = z.object({
  /** Por ahora solo órdenes (M08). */
  tipo: z.literal('orden'),
  /** Identificador de la orden; hace idempotente la operación (P6). */
  id: z.string().min(1).max(100),
});
export type ReferenciaMovimiento = z.infer<typeof referenciaMovimientoSchema>;

export const lineaExistenciaSchema = z.object({
  idVariante: idSchema,
  cantidad: z.number().int().positive(),
});
export type LineaExistencia = z.infer<typeof lineaExistenciaSchema>;

export const resultadoDescuentoSchema = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true) }),
  z.object({
    ok: z.literal(false),
    /** La primera línea que no alcanzó y lo que había (dato interno para M08, no para el cliente: D5). */
    idVariante: idSchema,
    existenciaDisponible: existenciaSchema,
  }),
]);
export type ResultadoDescuento = z.infer<typeof resultadoDescuentoSchema>;

/**
 * Solo actúan sobre variantes de combos; para cualquier otra variante no hacen nada (la existencia
 * de un producto común es referencial y no se mueve con las ventas). `contexto` es la
 * transacción de base de datos de quien llama (opaca para este contrato).
 */
export interface ExistenciaComboPort {
  descontar(
    lineas: readonly LineaExistencia[],
    referencia: ReferenciaMovimiento,
    contexto?: unknown,
  ): Promise<ResultadoDescuento>;
  reponer(lineas: readonly LineaExistencia[], referencia: ReferenciaMovimiento, contexto?: unknown): Promise<void>;
}

/* ───────────────────────────────────────────────────────────────────────────
 * 8. ERRORES
 * ───────────────────────────────────────────────────────────────────────────
 * Mismo envelope global que las entregas anteriores. Estados HTTP: 400 PARAMETRO_INVALIDO,
 * IMAGEN_INVALIDA · 404 RECURSO_NO_DISPONIBLE (también toda denegación) · 409 DUPLICADO,
 * RELACION_INVALIDA, PADRE_INACTIVO. No se agregan códigos nuevos: se usan los de la entrega 2.
 *
 * RELACION_INVALIDA (409) con `details.campo` cubre: medida que no es de tipo Unidad (idMedida),
 * subcategoría o marca inactivas, categoría complementaria inexistente, variante o color que no
 * pertenecen al producto de la imagen (idVariante, idColor), y cualquier intento de editar un
 * combo por las rutas de producto o de variante (idProducto) — K9.
 */

/* ───────────────────────────────────────────────────────────────────────────
 * 9. CAMBIOS COMPARTIDOS QUE EXIGE LA IMPLEMENTACIÓN (PRs generales, uno por tema)
 * ───────────────────────────────────────────────────────────────────────────
 *  BD (esquema 4.8, aditivo, DDL idempotente):
 *    · producto.es_combo BOOLEAN NOT NULL DEFAULT false
 *    · producto.excluido_de_descuentos BOOLEAN NOT NULL DEFAULT false
 *    · subcategoria.id_categoria_complementaria INT NULL → categoria (ON DELETE SET NULL)  (D6)
 *    · imagen.miniatura BYTEA NULL · imagen.mediana BYTEA NULL                              (D7)
 *    · enum_origen_ajuste_inventario += 'orden'; enum_motivo_ajuste_inventario += 'venta',
 *      'devolucion'                                                                          (D8)
 *  core/ y dependencias:
 *    · dependencia `sharp` en backend/package.json (miniaturas)
 *    · el límite JSON de imágenes (7 MB) ya cubre POST /productos/:id/imagenes
 *  M13 (en el PR de código): ExistenciaComboPort; contrato y espejos con los valores nuevos.
 * ─────────────────────────────────────────────────────────────────────────── */

export const CODIGOS_ERROR_ENTREGA3 = [
  'PARAMETRO_INVALIDO',
  'RECURSO_NO_DISPONIBLE',
  'DUPLICADO',
  'RELACION_INVALIDA',
  'PADRE_INACTIVO',
  'IMAGEN_INVALIDA',
] as const;

export const errorEntrega3EnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.enum(CODIGOS_ERROR_ENTREGA3),
    message: z.string(),
    /** DUPLICADO y RELACION_INVALIDA → el campo; el resto → null. */
    details: z.object({ campo: z.string() }).nullable(),
  }),
});
export type ErrorEntrega3Envelope = z.infer<typeof errorEntrega3EnvelopeSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 10. MAPA DE RUTAS
 * ───────────────────────────────────────────────────────────────────────────
 *  ADMINISTRACIÓN (montaje: /api/v1/admin/catalogo)
 *  GET  /combos                          catalogo.ver     → listar (paginado)
 *  POST /combos                          catalogo.crear   → crea producto + variante (K1, K2)
 *  GET  /combos/:idProducto              catalogo.ver
 *  PUT  /combos/:idProducto              catalogo.editar
 *  PATCH /imagenes/:idImagen/asociacion  catalogo.editar  → cambia la variante/color de una imagen (I5)
 *  (estado, publicación, imágenes e impacto de un combo: las rutas de /productos/:idProducto/…)
 *  (la existencia de un combo: PUT /api/v1/admin/inventario/variantes/:idVariante/existencia, M13)
 *
 *  PÚBLICO (montaje: /api/v1/catalogo) — sin autenticación, solo lectura
 *  GET  /productos/:idProducto/complementarios   → hasta 4 tarjetas (X1–X4)
 *  GET  /imagenes/:idImagen?tamano=miniatura|mediana|original   (I7)
 *
 *  INTERNO (sin HTTP): CatalogoParaCompraPort (M01) · ExistenciaComboPort (M13)
 * ─────────────────────────────────────────────────────────────────────────── */
