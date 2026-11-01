import type { CrearProductoDatos } from './productos.interface';

/** Un registro de catálogo activo, tal como lo necesita la carga masiva para resolver nombres a ids. */
export interface RegistroCarga {
  id: number;
  nombre: string;
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

/** Lo que la carga masiva lee y escribe en la base de datos (contrato `m01-catalogo-carga-masiva`). */
export interface CargaProductosRepositoryPort {
  /** Solo registros activos (C9). */
  leerCatalogos(): Promise<CatalogosCarga>;
  leerColores(idsMarca: readonly number[]): Promise<ColorCarga[]>;
  productosDeMarcas(idsMarca: readonly number[]): Promise<ProductoExistenteCarga[]>;
  /** Devuelve los SKU que ya existen, en minúsculas. */
  skusExistentes(skus: readonly string[]): Promise<Set<string>>;
  /** Devuelve los códigos de proveedor que ya existen, en minúsculas. */
  codigosProveedorExistentes(codigos: readonly string[]): Promise<Set<string>>;
  /** C5: el producto y todas sus variantes, en una sola transacción. Devuelve el id del producto. */
  crearProductoConVariantes(producto: CrearProductoDatos, variantes: readonly VarianteNuevaDatos[]): Promise<number>;
}
