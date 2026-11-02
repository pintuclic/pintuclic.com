import { z } from 'zod';

/**
 * ============================================================================
 * CONTRATO — M01. Carga masiva de productos con plantilla Excel — BORRADOR
 * ============================================================================
 * Scope: m01-catalogo · Extiende `m01-catalogo-productos.contract.ts` (mismo patrón que la carga masiva de
 * colores, RF-CAT-05-03). Base de datos: sin tablas nuevas.
 *
 * Regla de Oro #1: Cero código de implementación sin contrato previo.
 * Regla de Oro #11: Tolerancia Cero al tipo `any`.
 * Estado: BORRADOR a la espera de que el Tech Lead lo dé por bueno.
 *
 * QUÉ HACE
 *  Permite crear muchos productos a la vez: se descarga una plantilla Excel generada desde la base de datos, se llena,
 *  se sube, y el sistema LISTA los productos que se van a crear (con sus variantes y los errores por fila) para que se
 *  revisen. Solo después aparece el botón «Cargar productos», que los crea.
 *
 * QUÉ NO HACE
 *  · No actualiza nada: un producto que ya existe se reporta y no se toca (C1, C3).
 *  · No crea colores: necesitan datos que el Excel no trae (hexadecimal y acabado) y deben existir (C9).
 *  · No lleva imágenes, combos ni existencia inicial (C6).
 *  · No publica: los productos nacen sin publicar (C6).
 *
 * REGLAS
 *  C1  SOLO CREAR. La carga nunca modifica ni borra productos o variantes existentes.
 *  C2  PRODUCTO = (marca, producto), comparados sin tildes, mayúsculas ni espacios sobrantes. Varias filas con la
 *      misma pareja son variantes de un solo producto. Los datos del PRODUCTO (línea, subcategoría, descripción, usos,
 *      listas y ficha) deben ser iguales en todas sus filas; si difieren, el producto se rechaza
 *      (`datos_del_producto_distintos`) y no se adivina cuál vale.
 *  C3  YA EXISTE. Si (marca, producto) ya está en el catálogo, el producto es `ya_existe` y NO se le agregan variantes.
 *  C4  MISMAS REGLAS QUE EL ALTA MANUAL. La carga cumple P1 a P10 y V1 a V5 de `m01-catalogo-productos.contract.ts`
 *      llamando a los mismos servicios; no se duplican reglas. En particular: la línea es de la marca del producto, un
 *      recubrimiento exige línea, las bases exigen al menos un acabado y la variante es única por (producto, medida) y
 *      por SKU.
 *  C5  UNA TRANSACCIÓN POR PRODUCTO. El producto y todas sus variantes se crean juntos o no se crea nada de él. Un
 *      producto rechazado no impide crear los demás.
 *  C6  NACEN SIN PUBLICAR y sus variantes con existencia 0 (D9 y D10 de M01: publicar exige imagen y la existencia
 *      solo la escribe M13). Las imágenes y la publicación se hacen después, desde el producto.
 *  C7  PREVISUALIZAR NO ESCRIBE. APLICAR vuelve a validar todo contra la base de datos, porque entre una y otra otra
 *      persona pudo crear o renombrar algo. Aplicar es idempotente: repetir la carga deja los productos como `ya_existe`.
 *  C8  BLOQUES. El navegador lee el archivo y lo envía por bloques de hasta 500 filas que NUNCA parten un producto (todas
 *      sus filas van en el mismo bloque). Un producto con más filas que el bloque se rechaza (`producto_demasiado_grande`).
 *      Archivo: máximo 2 000 filas y 5 MB.
 *  C9  POR NOMBRE, NO POR ID. Marca, línea, categoría, subcategoría, medida, acabados, bases, superficies, colores de
 *      fábrica y resina se escriben por su nombre, ignorando tildes y mayúsculas. Si el nombre está inactivo o es
 *      ambiguo, la fila se rechaza con su motivo. Si no existe: el color se rechaza; los demás se crean (C16).
 *  C16 CATÁLOGOS NUEVOS. Una marca, línea, categoría, subcategoría, superficie, acabado, base, tipo de resina o
 *      medida que no existe se CREA activo junto con el producto, dentro de su misma transacción (C5): si el producto se rechaza, no
 *      queda nada creado. La vista previa lo anuncia en `nuevos` sin escribir (C7). La línea nace de la marca de la fila
 *      y la subcategoría de su categoría. No se crean los inactivos: la fila se rechaza para no duplicarlos. La marca
 *      exige logotipo (R9) y el Excel no lo trae: nace con uno transparente provisional y se avisa para que se suba
 *      después desde Marcas. Como crea catálogo, exige el mismo permiso `catalogo.crear` (C11). Una marca nueva no tiene
 *      colores, así que sus colores de fábrica se rechazan. MEDIDA: se deduce del texto «cantidad + unidad» (`1/4 de
 *      galón`, `300 ml`, `5 galones`, `0,5 L`: nombre, plural o abreviatura de un tipo de medida activo; valor hasta 3
 *      decimales); primero se busca por nombre y luego por (tipo, valor), porque «1 gal» y «1 galón» son la misma. Un
 *      texto que no se entiende («Cuarto») se rechaza `medida_no_encontrada` explicando por qué.
 *  C10 FÓRMULAS. Una celda que empieza por `=`, `+`, `-` o `@` se trata como texto; en el informe de errores se prefija
 *      con `'` para que Excel no la ejecute (D4 de M13).
 *  C11 PERMISO. Todo exige `catalogo.crear` (como importar colores). Sin sesión o sin permiso: 404 RECURSO_NO_DISPONIBLE.
 *  C12 AUDITORÍA. Cada aplicación se registra en M20: quién, cuándo y cuántos productos y variantes (cantidades, nunca
 *      el contenido del archivo).
 *  C13 PLANTILLA VERSIONADA. El libro lleva su versión; una plantilla antigua se rechaza con un mensaje claro.
 *  C15 CARACTERÍSTICAS TÉCNICAS. Una sola columna «Características» con pares `Nombre: valor` separados por `;`
 *      (ej. `Acabado: Mate; Secado: 2 horas`). El nombre llega hasta el primer `:`; el valor no puede llevar `;`. Son datos
 *      del PRODUCTO (iguales en todas sus filas, C2), hasta 50, sin nombres repetidos, y quedan en el orden escrito.
 *      Un par mal formado se rechaza con `caracteristica_invalida`; un nombre repetido, con `caracteristica_repetida`.
 *  C14 SKU. Si la fila no lo trae, se genera `P{idProducto}-V{idVariante}` (V3).
 *
 * DECISIONES POR DEFECTO (el Tech Lead puede vetarlas)
 *  D1  Una FILA = una VARIANTE. Es lo más fácil de llenar y de revisar en Excel.
 *  D2  El Excel se lee en el NAVEGADOR y se envía como JSON por bloques, como la carga de colores y M13. El servidor
 *      valida igual; nunca confía en lo que el navegador dice haber leído.
 *  D3  La plantilla la genera el SERVIDOR (necesita la base de datos y el permiso) y se descarga como `.xlsx`.
 *      Sus hojas de catálogos alimentan listas desplegables en las columnas que se eligen de un catálogo.
 *  D4  Librería de Excel: `exceljs` (cambio compartido, PR general).
 *  D5  Sin tabla de historial de cargas en esta versión: queda la auditoría de M20 (C12). Una tabla propia es la
 *      pregunta Q1.
 *
 * PREGUNTAS ABIERTAS
 *  Q1  ¿Se necesita un historial de cargas consultable en pantalla (quién, cuándo, cuántas filas)? Implica una tabla.
 *  Q2  ¿El cliente quiere cargar también la existencia inicial en la misma plantilla? (las características técnicas ya van, C15)
 *
 * Fuente de verdad: docs/02_MODULOS_FUNCIONALES/M01_ESPECIFICACION_CATALOGO.md
 * ============================================================================
 */

/* ───────────────────────────────────────────────────────────────────────────
 * 1. PRIMITIVAS Y LÍMITES
 * ─────────────────────────────────────────────────────────────────────────── */

export const VERSION_PLANTILLA_PRODUCTOS = 1;
export const MAXIMO_FILAS_BLOQUE_PRODUCTOS = 500;
export const MAXIMO_FILAS_ARCHIVO_PRODUCTOS = 2000;
export const MAXIMO_BYTES_ARCHIVO_PRODUCTOS = 5 * 1024 * 1024;

/** Columnas de la hoja «Productos», en orden. La primera fila del libro las lleva como encabezado. */
export const COLUMNAS_PLANTILLA_PRODUCTOS = [
  'Marca',
  'Línea',
  'Categoría',
  'Subcategoría',
  'Producto',
  'Descripción',
  'Uso interior',
  'Uso exterior',
  'Medida',
  'SKU',
  'Precio',
  'Código de proveedor',
  'Superficies',
  'Acabados',
  'Bases',
  'Colores de fábrica',
  'Características',
  'Tipo de resina',
  'Calidad (1 a 3)',
  'Rendimiento mínimo (m²/galón)',
  'Rendimiento máximo (m²/galón)',
  'Manos',
] as const;

const textoSchema = z.string().trim().max(150);
const listaTextoSchema = z.array(z.string().trim().min(1).max(100)).max(100);

/* ───────────────────────────────────────────────────────────────────────────
 * 2. ENTRADA: UNA FILA DEL EXCEL = UNA VARIANTE
 * ─────────────────────────────────────────────────────────────────────────── */

/** C15: una característica técnica del producto (nombre hasta 100, valor hasta 255, como `producto_caracteristica`). */
export const caracteristicaCargaSchema = z.object({
  nombre: z.string().trim().min(1).max(100),
  valor: z.string().trim().min(1).max(255),
});
export type CaracteristicaCarga = z.infer<typeof caracteristicaCargaSchema>;

export const filaProductoCargaSchema = z.object({
  /** Número de la fila en el Excel (empieza en 2: la 1 es el encabezado). Sirve para ubicar los errores. */
  fila: z.number().int().min(2),
  marca: textoSchema.min(1),
  linea: textoSchema.nullable(),
  categoria: textoSchema.min(1),
  subcategoria: textoSchema.min(1),
  producto: textoSchema.min(1),
  descripcion: z.string().trim().max(5000).nullable(),
  usoInterior: z.boolean(),
  usoExterior: z.boolean(),
  medida: textoSchema.min(1),
  /** null → se genera (C14). */
  sku: z.string().trim().max(60).nullable(),
  precio: z.number().min(0).max(9_999_999_999.99),
  codigoProveedor: z.string().trim().max(100).nullable(),
  superficies: listaTextoSchema,
  acabados: listaTextoSchema,
  bases: listaTextoSchema,
  coloresFabrica: listaTextoSchema,
  /** C15: el navegador separa «Nombre: valor; Nombre: valor» en pares; el orden es el escrito. */
  caracteristicas: z.array(caracteristicaCargaSchema).max(50),
  /** Presente solo en recubrimientos (ficha). */
  tipoResina: textoSchema.nullable(),
  tipoCalidad: z.number().int().min(1).max(3).nullable(),
  rendimientoMin: z.number().positive().max(99_999).nullable(),
  rendimientoMax: z.number().positive().max(99_999).nullable(),
  manos: z.number().int().min(1).max(10).nullable(),
});
export type FilaProductoCarga = z.infer<typeof filaProductoCargaSchema>;

/** POST /productos/importar/previsualizar y POST /productos/importar/aplicar */
export const cargarProductosRequestSchema = z.object({
  filas: z.array(filaProductoCargaSchema).min(1).max(MAXIMO_FILAS_BLOQUE_PRODUCTOS),
});
export type CargarProductosRequest = z.infer<typeof cargarProductosRequestSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 3. SALIDA: LOS PRODUCTOS QUE SE VAN A CREAR (O SE CREARON), PARA REVISARLOS
 * ─────────────────────────────────────────────────────────────────────────── */

export const MOTIVOS_RECHAZO_PRODUCTO = [
  'marca_no_encontrada',
  'linea_no_encontrada',
  'linea_de_otra_marca',
  'categoria_no_encontrada',
  'subcategoria_no_encontrada',
  'medida_no_encontrada',
  'superficie_no_encontrada',
  'acabado_no_encontrado',
  'base_no_encontrada',
  'color_no_encontrado',
  'resina_no_encontrada',
  'nombre_ambiguo',
  'recubrimiento_sin_linea',
  'acabados_sin_ficha',
  'bases_sin_acabado',
  'datos_del_producto_distintos',
  'caracteristica_invalida',
  'caracteristica_repetida',
  'producto_demasiado_grande',
  'variante_repetida_en_archivo',
  'sku_repetido_en_archivo',
  'sku_ya_existe',
  'sku_invalido',
  'dato_invalido',
  'producto_rechazado',
] as const;
/** C16: lo que la carga crea además del producto cuando su nombre no existe en el catálogo. */
export const TIPOS_CATALOGO_NUEVO = [
  'marca',
  'linea',
  'categoria',
  'subcategoria',
  'medida',
  'superficie',
  'acabado',
  'base',
  'tipo_resina',
] as const;
export const catalogoNuevoSchema = z.object({ tipo: z.enum(TIPOS_CATALOGO_NUEVO), nombre: z.string() });
export type CatalogoNuevo = z.infer<typeof catalogoNuevoSchema>;

export const motivoRechazoProductoSchema = z.enum(MOTIVOS_RECHAZO_PRODUCTO);
export type MotivoRechazoProducto = z.infer<typeof motivoRechazoProductoSchema>;

export const varianteCargaSchema = z.object({
  fila: z.number().int().min(2),
  medida: z.string(),
  sku: z.string().nullable(),
  precio: z.number().nullable(),
  /** `por_crear` en la vista previa; `creada` al aplicar. */
  resultado: z.enum(['por_crear', 'creada', 'rechazada']),
  motivo: motivoRechazoProductoSchema.nullable(),
  /** Frase para el usuario: qué columna falló y con qué valor. Nunca trazas ni SQL. */
  detalle: z.string().nullable(),
});
export type VarianteCarga = z.infer<typeof varianteCargaSchema>;

export const productoCargaSchema = z.object({
  marca: z.string(),
  producto: z.string(),
  categoria: z.string(),
  subcategoria: z.string(),
  linea: z.string().nullable(),
  /** `por_crear` en la vista previa; `creado` al aplicar; `ya_existe` y `rechazado` en ambas (C3, C2). */
  resultado: z.enum(['por_crear', 'creado', 'ya_existe', 'rechazado']),
  motivo: motivoRechazoProductoSchema.nullable(),
  detalle: z.string().nullable(),
  /** Solo cuando ya se creó (aplicar) o ya existía. */
  idProducto: z.number().int().positive().nullable(),
  /** C16: marcas, líneas, categorías… que se crearán (o se crearon) con este producto porque no existían. */
  nuevos: z.array(catalogoNuevoSchema),
  variantes: z.array(varianteCargaSchema),
});
export type ProductoCarga = z.infer<typeof productoCargaSchema>;

export const balanceCargaProductosSchema = z.object({
  productos: z.number().int().nonnegative(),
  productosNuevos: z.number().int().nonnegative(),
  productosYaExisten: z.number().int().nonnegative(),
  productosRechazados: z.number().int().nonnegative(),
  variantes: z.number().int().nonnegative(),
  variantesNuevas: z.number().int().nonnegative(),
  variantesRechazadas: z.number().int().nonnegative(),
});
export type BalanceCargaProductos = z.infer<typeof balanceCargaProductosSchema>;

export const cargarProductosResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    /** false en la vista previa: no se escribió nada (C7). */
    aplicada: z.boolean(),
    balance: balanceCargaProductosSchema,
    productos: z.array(productoCargaSchema),
  }),
});
export type CargarProductosResponse = z.infer<typeof cargarProductosResponseSchema>;

/* ───────────────────────────────────────────────────────────────────────────
 * 4. MAPA DE RUTAS (montaje: /api/v1/admin/catalogo, detrás de la sesión)
 * ───────────────────────────────────────────────────────────────────────────
 *  GET  /productos/importar/plantilla       → libro .xlsx con los catálogos actuales (D3)       catalogo.crear
 *  POST /productos/importar/previsualizar   → { aplicada:false, balance, productos }             catalogo.crear
 *  POST /productos/importar/aplicar         → { aplicada:true,  balance, productos }             catalogo.crear
 *
 *  Errores: 400 PARAMETRO_INVALIDO (cuerpo mal formado o plantilla de otra versión) ·
 *           404 RECURSO_NO_DISPONIBLE (sin sesión o sin permiso) · 413 si el cuerpo supera el límite.
 *  Los errores de CONTENIDO (un nombre que no existe, un SKU repetido) no son HTTP: viajan por fila en
 *  `productos[].variantes[].motivo` con respuesta 200, para que el resto del archivo siga su curso.
 *
 *  Pantalla (catálogo del panel): descargar plantilla → subir el Excel → LISTA de productos a crear (con sus variantes
 *  y los rechazados resaltados, filtro «solo errores») → botón «Cargar N productos» (deshabilitado si no hay ninguno
 *  válido) → resultado final con el balance y el informe de errores descargable (.xlsx).
 * ─────────────────────────────────────────────────────────────────────────── */
