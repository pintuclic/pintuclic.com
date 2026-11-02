import { z } from 'zod';

/**
 * ============================================================================
 * DTOs Y ESQUEMAS — M01. Carga masiva de productos (espejo de contracts/m01-catalogo-carga-masiva.contract.ts)
 * ============================================================================
 * La voz de la verdad es el contrato. Regenerar copiando el cuerpo tras el primer cierre de comentario.
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
