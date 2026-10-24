import type {
  CategoriaPublica,
  FiltrosPublicos,
  ListarColoresProductoRequest,
  ListarProductosPublicosRequest,
  ProductoPublicoFicha,
  ProductoPublicoTarjeta,
} from '../dtos/m01-catalogo-productos.dto';
import type { LogotipoMarca, Pagina } from './catalogo.interface';
import type { ColoresDeProducto } from './productos.interface';

/**
 * Lectura pública del catálogo (U1–U7). Todo responde solo con productos visibles:
 * activos, publicados y con su cadena (marca, línea, subcategoría, categoría) activa.
 */
export interface ConsultaPublicaRepositoryPort {
  /** U2: solo categorías y subcategorías con productos visibles. */
  categorias(): Promise<CategoriaPublica[]>;
  filtros(): Promise<FiltrosPublicos>;
  listar(query: ListarProductosPublicosRequest): Promise<Pagina<ProductoPublicoTarjeta>>;
  /** null si el producto no existe o no es visible (U1). */
  ficha(idProducto: number): Promise<ProductoPublicoFicha | null>;
  /** null si el producto no es visible; U3: paginada y bajo demanda. */
  colores(idProducto: number, query: ListarColoresProductoRequest): Promise<ColoresDeProducto | null>;
  /** Solo marcas activas. */
  logotipo(idMarca: number): Promise<LogotipoMarca | null>;
}
