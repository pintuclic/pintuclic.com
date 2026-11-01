import type { Caracteristica } from '../dtos/m01-catalogo-productos.dto';

/** Un registro de catálogo, tal como lo necesita la carga masiva para resolver nombres a ids. */
export interface RegistroCarga {
  id: number;
  nombre: string;
  /** Un registro inactivo no se usa ni se vuelve a crear (C9, C16). */
  activo: boolean;
}

export interface CatalogosCarga {
  marcas: RegistroCarga[];
  lineas: Array<RegistroCarga & { idMarca: number }>;
  categorias: RegistroCarga[];
  subcategorias: Array<RegistroCarga & { idCategoria: number }>;
  medidas: RegistroCarga[];
  superficies: RegistroCarga[];
  acabados: RegistroCarga[];
  bases: RegistroCarga[];
  tiposResina: RegistroCarga[];
}

export interface ColorCarga extends RegistroCarga {
  idMarca: number;
}

export interface ProductoExistenteCarga {
  idProducto: number;
  idMarca: number;
  nombre: string;
}

export interface VarianteNuevaDatos {
  idMedida: number;
  precio: number;
  /** null → se genera `P{idProducto}-V{idVariante}` (C14). */
  sku: string | null;
  codigoProveedor: string | null;
}

/** C16: un registro que ya existe (su id) o uno que se creará dentro de la transacción del producto (su nombre). */
export type Referencia = { id: number } | { nuevo: string };

export interface FichaCargaDatos {
  tipoResina: Referencia;
  tipoCalidad: 1 | 2 | 3 | null;
  rendimientoMin: number | null;
  rendimientoMax: number | null;
  manos: number | null;
}

/** Datos finales de un producto de la carga: como el alta manual, pero con referencias que pueden ser nuevas (C16). */
export interface ProductoCargaDatos {
  marca: Referencia;
  /** De la marca del producto. */
  linea: Referencia | null;
  categoria: Referencia;
  /** De `categoria`. */
  subcategoria: Referencia;
  nombre: string;
  descripcion: string | null;
  usoInterior: boolean;
  usoExterior: boolean;
  ficha: FichaCargaDatos | null;
  superficies: Referencia[];
  acabados: Referencia[];
  bases: Referencia[];
  /** Siempre existentes: un color no se crea desde la carga. */
  idsColoresFabrica: number[];
  caracteristicas: Caracteristica[];
}

/** Lo que la carga masiva lee y escribe en la base de datos (contrato `m01-catalogo-carga-masiva`). */
export interface CargaProductosRepositoryPort {
  /** Activos e inactivos, para no duplicar un nombre inactivo (C9, C16). */
  leerCatalogos(): Promise<CatalogosCarga>;
  leerColores(idsMarca: readonly number[]): Promise<ColorCarga[]>;
  productosDeMarcas(idsMarca: readonly number[]): Promise<ProductoExistenteCarga[]>;
  /** Devuelve los SKU que ya existen, en minúsculas. */
  skusExistentes(skus: readonly string[]): Promise<Set<string>>;
  /** Devuelve los códigos de proveedor que ya existen, en minúsculas. */
  codigosProveedorExistentes(codigos: readonly string[]): Promise<Set<string>>;
  /**
   * C5 / C16: crea lo que falte del catálogo, el producto y todas sus variantes en una sola transacción.
   * Devuelve el id del producto.
   */
  crearProductoConVariantes(producto: ProductoCargaDatos, variantes: readonly VarianteNuevaDatos[]): Promise<number>;
}
