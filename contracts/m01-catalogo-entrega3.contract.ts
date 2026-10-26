import { z } from 'zod';
import {
  estadoSchema,
  hexadecimalSchema,
  idSchema,
  paginacionQuerySchema,
  respuestaLista,
  respuestaPaginada,
  respuestaUno,
} from './m01-catalogo.contract';
import {
  disponibilidadSchema,
  existenciaSchema,
  imagenProductoSchema,
  precioSchema,
  productoPublicoTarjetaSchema,
  skuSchema,
  subirImagenRequestSchema,
} from './m01-catalogo-productos.contract';

/**
 * ============================================================================
 * CONTRATO DE API REST — M01. Catálogo · ENTREGA 3: COMBOS, COMPLEMENTARIOS,
 * IMÁGENES POR VARIANTE/COLOR Y PUERTOS PARA LOS MÓDULOS QUE DEPENDEN DEL CATÁLOGO
 * ============================================================================
 * Scope: m01-catalogo · Ola 2/3 · Base de datos: esquema 4.7 + los cambios de la sección 9
 * Depende de las entregas 1 y 2 (m01-catalogo.contract.ts, m01-catalogo-productos.contract.ts)
 * y de M13 (la existencia de un combo se ajusta ahí).
 *
 * Este contrato ES la especificación de la entrega y lo que el Tech Lead revisa antes de
 * que se escriba el código. Lo que cambie aquí cambia el módulo.
 *
 * ── Qué incluye ─────────────────────────────────────────────────────────────
 *  1. Combos (HU-CAT-13): un paquete a precio propio, vendido como un producto más.
 *  2. Productos complementarios (HU-CAT-08): hasta 4 sugerencias en la ficha.
 *  3. Imágenes por variante o por color, y miniaturas (HU-CAT-07: RF-CAT-07-02, RNF-CAT-07-01).
 *  4. Dos PUERTOS INTERNOS (no son rutas HTTP) para que M05, M07, M08, M06 y M21 no tengan que
 *     leer las tablas del catálogo ni repetir sus reglas:
 *       · CatalogoParaCompraPort (lo implementa M01): ¿se puede vender esto?, ¿a qué precio?,
 *         ¿qué datos se copian a la línea de la orden?
 *       · ExistenciaComboPort (lo implementa M13): descontar y reponer la existencia de un combo.
 *
 * ── Qué NO incluye ──────────────────────────────────────────────────────────
 *  · Composición del combo: el combo NO declara de qué productos se compone (RF-CAT-13-01,
 *    CA-CAT-13-02). Las tablas `combo` y `variante_combo` quedan sin uso (D2).
 *  · Descuentos y precio B2B: son de M06. M01 solo informa el precio base y si el combo está
 *    excluido de descuentos.
 *  · Búsqueda y filtros avanzados: son de M02.
 *  · Campañas de patrocinio: son de M14. Aquí `patrocinado` sigue siendo una marca del producto.
 *  · Importación desde SAMIT: módulo futuro. Debe saltarse siempre los combos (CA-CAT-13-08).
 *
 * ── Reglas de combos ────────────────────────────────────────────────────────
 *  K1  Un combo es un producto con `esCombo: true`. Se publica, se desactiva, tiene imágenes,
 *      precio y SKU como cualquier producto; la vitrina, el carrito y la orden no lo distinguen
 *      salvo por K5. `esCombo` no cambia nunca: un producto no se convierte en combo ni al revés.
 *  K2  Tiene EXACTAMENTE UNA variante, que se crea junto con él, en una medida de tipo
 *      "Unidad" (p. ej. "1 unidad", que el administrador crea en Medidas). Esa variante lleva el
 *      precio, el SKU y la existencia; así carrito, orden, precios e inventario funcionan sin
 *      cambios (variante = lo que se vende).
 *  K3  Un combo es "sin color": sin ficha de recubrimiento, bases, acabados ni colores de fábrica.
 *  K4  `excluidoDeDescuentos`: si es true, M06 no le aplica ninguna rebaja, tampoco a clientes
 *      empresa (CA-CAT-13-09).
 *  K5  Es el ÚNICO producto cuya venta se limita por existencia (excepción a "vender sin stock",
 *      RF-CAT-13-02): no se puede comprar más de lo que declara ni cuando está en 0.
 *  K6  La existencia se descuenta al CREAR la orden (no al agregar al carrito: veinte carritos
 *      no la bajan, CA-CAT-13-04), en la misma transacción que la orden, de forma atómica y sin
 *      llegar nunca a menos de cero (CA-CAT-13-05). Se repone al cancelarse o devolverse la
 *      orden (CA-CAT-13-07). Lo hace ExistenciaComboPort; M08 lo invoca.
 *  K7  La existencia inicial es 0 (como toda variante, D7 de M13). Se fija en M13 con el ajuste
 *      manual; la pantalla de creación encadena ambos pasos para quien registra el combo.
 *  K8  Agotado (existencia 0) = no comprable, y no se sugiere como complementario (RF-CAT-13-04).
 *  K9  Los combos se crean y editan SOLO por /combos. PUT /productos/:id, POST
 *      /productos/:id/variantes y PUT /variantes/:id sobre un combo responden 409
 *      RELACION_INVALIDA. Estado, publicación, imágenes e impacto usan las rutas de producto.
 *  K10 La marca es obligatoria (es la de la tabla `producto`). Un combo de varias marcas se
 *      registra bajo una marca "Pintu Clic" que crea el administrador (RF-CAT-13-09, D3).
 *
 * ── Reglas de complementarios ───────────────────────────────────────────────
 *  X1  GET público de hasta 4 productos para la ficha de un producto.
 *  X2  Origen: los productos visibles de la categoría complementaria del producto o, si no
 *      tiene, la de su subcategoría (D6). Los patrocinados van primero; el resto, al azar.
 *  X3  Sin categoría complementaria (ni en el producto ni en su subcategoría) solo se muestran
 *      patrocinados; si no hay ninguno, la lista va vacía y la pantalla oculta la sección.
 *  X4  Se excluyen: el propio producto, los no visibles (producto o variantes inactivas, cadena
 *      inactiva) y los combos agotados.
 *  X5  Solo se sugieren en la ficha. El carrito no llama a este endpoint (CA-CAT-08-05).
 *
 * ── Reglas de imágenes ──────────────────────────────────────────────────────
 *  I5  Una imagen de producto puede asociarse a UNA variante o a UN color (no a ambos). La
 *      variante debe ser del producto y el color debe estar en su carta o colores de fábrica.
 *  I6  La ficha pública entrega, por imagen, la variante o el color a que pertenece; al elegir
 *      ese color o esa medida la pantalla muestra esa imagen (CA-CAT-07-03).
 *  I7  Al subir una imagen se generan su miniatura (320 px) y su versión mediana (960 px), en
 *      WebP. Los listados usan la miniatura y la ficha la mediana (CA-CAT-07-04). Una imagen
 *      nunca se edita en su lugar (reemplazar = subir otra y quitar la anterior), así que sus
 *      bytes se pueden cachear sin vencimiento.
 *
 * ── Reglas de los puertos ───────────────────────────────────────────────────
 *  P1  "Vendible" = variante activa, producto activo y publicado, cadena (marca, línea,
 *      subcategoría, categoría) activa y, si es combo, con existencia. Es la misma regla que ya
 *      usa la vitrina, calculada en un solo lugar.
 *  P2  Si se envía `idColor`, debe ser un color que el producto ofrece (carta de un entonable o
 *      color de fábrica) y activo; si no, `color_no_ofrecido`. Un color sobre un producto sin
 *      color también se rechaza.
 *  P3  El precio es el PRECIO BASE de la variante. Promociones y precio B2B los calcula M06 sobre
 *      este valor; el carrito es una referencia viva y siempre vuelve a preguntar (RF-CAR-05-04).
 *  P4  `topeUnidades` solo existe en combos (K5): es la existencia que hay. Es un dato INTERNO
 *      para validar cantidades; la vitrina nunca expone existencias exactas (U7).
 *  P5  Los datos de la línea (nombre, marca, medida, SKU, color, precio base) son lo que M08
 *      copia a la orden, que luego no depende del catálogo (ADR-05 de M08).
 *  P6  descontar() es todo o nada para el conjunto de líneas y se ejecuta dentro de la
 *      transacción que le pase M08; si una línea no alcanza, no se descuenta ninguna.
 *      Repetir una misma referencia no descuenta dos veces (idempotente por referencia).
 *
 * ── Decisiones por defecto (el Tech Lead puede vetarlas) ────────────────────
 *  D1  Un combo es un producto con una variante (K1, K2) en vez de una entidad nueva. Es lo que
 *      deja M05, M08, M06 y M13 funcionando sin tocarlos.
 *  D2  Las tablas `combo` y `variante_combo` no se usan. Se dejan intactas (sin borrar datos) y
 *      se retirarán más adelante si el cliente confirma que nunca declarará la composición.
 *  D3  RF-CAT-13-09 (marca de un combo de varias marcas): se resuelve con una marca "Pintu Clic"
 *      creada por el administrador (K10). Sin cambios de código.
 *  D4  El administrador solo ve la existencia de un combo en M13 (Inventario), que ya lista
 *      todas las variantes, y allí la ajusta (RF-CAT-13-05). No hay un segundo lugar donde editarla.
 *  D5  Cantidad máxima que un cliente ve de un combo: ninguna. La vitrina solo dice "agotado";
 *      si pide más de lo que hay, M05 responde "no hay suficientes unidades" sin decir cuántas (U7).
 *  D6  La categoría complementaria puede ponerse también en la SUBCATEGORÍA (RF-CAT-08-01:
 *      "a un producto o categoría"), como valor por defecto de sus productos. Cambia la
 *      entrega 1 (ver sección 9).
 *  D7  Las miniaturas se generan al subir (sharp) y se guardan en la base de datos; las imágenes
 *      anteriores se completan la primera vez que alguien las pide (sin migración masiva).
 *  D8  M13 pasa a implementar ExistenciaComboPort con dos valores nuevos en su historial
 *      (origen 'orden'; motivos 'venta' y 'devolucion'). Su contrato se actualiza en el PR de
 *      código de esta entrega, no antes.
 *
 * Regla de Oro #1: Cero código sin contrato previo.
 * Regla de Oro #11: Tolerancia Cero al tipo `any`.
 * ============================================================================
 */

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
