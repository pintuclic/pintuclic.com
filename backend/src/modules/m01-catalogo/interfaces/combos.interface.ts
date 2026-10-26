import type { Combo, ListarCombosRequest } from '../dtos/m01-catalogo-entrega3.dto';
import type { Pagina } from './catalogo.interface';

/** Datos finales de un combo nuevo (ya validados por el servicio). */
export interface CrearComboDatos {
  idMarca: number;
  idSubcategoria: number;
  nombre: string;
  descripcion: string | null;
  idMedida: number;
  precio: number;
  /** null → el repositorio genera `P{idProducto}-V{idVariante}`. */
  sku: string | null;
  excluidoDeDescuentos: boolean;
  idCategoriaComplementaria: number | null;
}

/** Solo viajan los campos que cambian. La marca y la medida no cambian. */
export interface EditarComboDatos {
  idSubcategoria?: number;
  nombre?: string;
  descripcion?: string | null;
  precio?: number;
  sku?: string;
  excluidoDeDescuentos?: boolean;
  idCategoriaComplementaria?: number | null;
}

/** Combos (HU-CAT-13): un producto con `es_combo` y su única variante. */
export interface CombosRepositoryPort {
  listar(query: ListarCombosRequest): Promise<Pagina<Combo>>;
  /** null si el producto no existe o no es un combo. */
  obtener(idProducto: number): Promise<Combo | null>;
  /** Crea el producto y su variante en una sola transacción (K1, K2). */
  crear(datos: CrearComboDatos): Promise<Combo>;
  editar(idProducto: number, datos: EditarComboDatos): Promise<Combo>;
}
