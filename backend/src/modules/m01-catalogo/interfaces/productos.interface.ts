import type {
  Caracteristica,
  ColorOfrecido,
  FamiliaDisponible,
  ListarColoresProductoRequest,
  ListarProductosRequest,
  ProductoDetalle,
  ProductoResumen,
  Variante,
} from '../dtos/m01-catalogo-productos.dto';
import type { Pagina, RecursoCatalogoPort } from './catalogo.interface';

export interface FichaRecubrimientoDatos {
  idTipoResina: number;
  tipoCalidad: 1 | 2 | 3 | null;
  rendimientoMin: number | null;
  rendimientoMax: number | null;
  manos: number | null;
}

/** Datos finales de un producto nuevo (ya normalizados y validados por el servicio). */
export interface CrearProductoDatos {
  idMarca: number;
  idLinea: number | null;
  idSubcategoria: number;
  nombre: string;
  descripcion: string | null;
  usoInterior: boolean;
  usoExterior: boolean;
  idCategoriaComplementaria: number | null;
  patrocinado: boolean;
  ficha: FichaRecubrimientoDatos | null;
  idsSuperficies: number[];
  idsAcabados: number[];
  idsBases: number[];
  idsColoresFabrica: number[];
  caracteristicas: Caracteristica[];
}

/** Solo viajan los campos que cambian; una lista enviada reemplaza a la actual (D11). La marca no cambia (P1). */
export interface EditarProductoDatos {
  idLinea?: number | null;
  idSubcategoria?: number;
  nombre?: string;
  descripcion?: string | null;
  usoInterior?: boolean;
  usoExterior?: boolean;
  idCategoriaComplementaria?: number | null;
  patrocinado?: boolean;
  ficha?: FichaRecubrimientoDatos | null;
  idsSuperficies?: number[];
  idsAcabados?: number[];
  idsBases?: number[];
  idsColoresFabrica?: number[];
  caracteristicas?: Caracteristica[];
}

export interface ClaveProducto {
  idMarca: number;
  nombre: string;
}

/** Ids a verificar (existen y están activos; los colores, además, son de la marca; P6). */
export interface RelacionesAVerificar {
  idMarca: number;
  idTipoResina?: number;
  idCategoriaComplementaria?: number;
  idsSuperficies?: readonly number[];
  idsAcabados?: readonly number[];
  idsBases?: readonly number[];
  idsColoresFabrica?: readonly number[];
}

export type CampoRelacion =
  | 'idTipoResina'
  | 'idCategoriaComplementaria'
  | 'idsSuperficies'
  | 'idsAcabados'
  | 'idsBases'
  | 'idsColoresFabrica';

export interface ColoresDeProducto {
  items: ColorOfrecido[];
  total: number;
  familias: FamiliaDisponible[];
}

export interface ProductosRepositoryPort extends RecursoCatalogoPort<
  ProductoDetalle,
  CrearProductoDatos,
  EditarProductoDatos,
  ClaveProducto
> {
  listar(query: ListarProductosRequest): Promise<Pagina<ProductoResumen>>;
  /** Devuelve el primer campo cuyos ids no existen, están inactivos o no corresponden a la marca. */
  verificarRelaciones(relaciones: RelacionesAVerificar): Promise<CampoRelacion | null>;
  cambiarPublicacion(id: number, publicado: boolean): Promise<ProductoDetalle>;
  contarVariantesActivas(idProducto: number): Promise<number>;
  contarImagenes(idProducto: number): Promise<number>;
  /** P5: colores que ofrece el producto, paginados, con las familias presentes. */
  listarColores(idProducto: number, query: ListarColoresProductoRequest): Promise<ColoresDeProducto>;
}

/* ─── Variantes ──────────────────────────────────────────────────────────── */

export interface CrearVarianteDatos {
  idProducto: number;
  idMedida: number;
  precio: number;
  /** null → el repositorio genera `P{idProducto}-V{idVariante}` (V3). */
  sku: string | null;
  existenciaReferencial: number;
  codigoProveedor: string | null;
}

export interface EditarVarianteDatos {
  precio?: number;
  sku?: string;
  existenciaReferencial?: number;
  codigoProveedor?: string | null;
}

export interface ClaveVariante {
  idProducto: number;
  idMedida: number;
}

export interface VariantesRepositoryPort extends RecursoCatalogoPort<
  Variante,
  CrearVarianteDatos,
  EditarVarianteDatos,
  ClaveVariante
> {
  existeSku(sku: string, excluirId?: number): Promise<boolean>;
  existeCodigoProveedor(codigo: string, excluirId?: number): Promise<boolean>;
}
