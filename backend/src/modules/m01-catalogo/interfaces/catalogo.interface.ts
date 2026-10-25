import type {
  Acabado,
  Base,
  Categoria,
  CrearAcabadoRequest,
  CrearBaseRequest,
  CrearCategoriaRequest,
  CrearFamiliaColorRequest,
  CrearSuperficieRequest,
  CrearTipoMedidaRequest,
  CrearTipoResinaRequest,
  EditarAcabadoRequest,
  EditarBaseRequest,
  EditarCategoriaRequest,
  EditarFamiliaColorRequest,
  EditarLineaRequest,
  EditarMarcaRequest,
  EditarSuperficieRequest,
  EditarTipoMedidaRequest,
  Estado,
  FamiliaColor,
  ImpactoDesactivacion,
  Linea,
  ListarBaseRequest,
  ListarCompletoRequest,
  ListarLineasRequest,
  ListarMedidasRequest,
  Marca,
  Medida,
  Subcategoria,
  Superficie,
  TipoMedida,
  TipoResina,
} from '../dtos/m01-catalogo.dto';

/** Resultado de una consulta paginada: la página y el total sin paginar. */
export interface Pagina<T> {
  items: T[];
  total: number;
}

/**
 * Operaciones comunes de todo recurso del catálogo base. Cada repositorio Prisma
 * las implementa; los servicios solo conocen este puerto.
 */
export interface RecursoCatalogoPort<E extends { estado: Estado }, CrearDatos, EditarDatos, Clave> {
  obtener(id: number): Promise<E | null>;
  crear(datos: CrearDatos): Promise<E>;
  editar(id: number, datos: EditarDatos): Promise<E>;
  /** Cambia el estado; al desactivar aplica la cascada de R5 dentro de una transacción. */
  cambiarEstado(id: number, estado: Estado): Promise<E>;
  contarImpacto(id: number): Promise<ImpactoDesactivacion>;
  /** R3/D4: ¿existe otro registro con la misma clave de unicidad, sin distinguir mayúsculas? */
  existeDuplicado(clave: Clave, excluirId?: number): Promise<boolean>;
  /** R7: el padre del recurso está activo (true si no tiene padre). */
  padreActivo(id: number): Promise<boolean>;
}

/* ─── Categorías y subcategorías ─────────────────────────────────────────── */

export interface CategoriasRepositoryPort
  extends RecursoCatalogoPort<Categoria, CrearCategoriaRequest, EditarCategoriaRequest, { nombre: string }> {
  /** Árbol completo (D5). */
  listar(query: ListarCompletoRequest): Promise<Categoria[]>;
}

export type CrearSubcategoriaDatos = CrearCategoriaRequest & { idCategoria: number };

export type SubcategoriasRepositoryPort = RecursoCatalogoPort<
  Subcategoria,
  CrearSubcategoriaDatos,
  EditarCategoriaRequest,
  { idCategoria: number; nombre: string }
>;

/* ─── Catálogos pequeños, sin paginar (D5) ───────────────────────────────── */

export interface ListaCompletaPort<E> {
  listar(query: ListarCompletoRequest): Promise<E[]>;
}

/** Búsqueda por nombre sin distinguir mayúsculas (importación de colores por nombre). */
export interface BuscablePorNombrePort<E> {
  buscarPorNombre(nombre: string): Promise<E | null>;
}

export type SuperficiesRepositoryPort = ListaCompletaPort<Superficie> &
  RecursoCatalogoPort<Superficie, CrearSuperficieRequest, EditarSuperficieRequest, { nombre: string }>;

export type TiposResinaRepositoryPort = ListaCompletaPort<TipoResina> &
  RecursoCatalogoPort<TipoResina, CrearTipoResinaRequest, CrearTipoResinaRequest, { nombre: string }>;

export type AcabadosRepositoryPort = ListaCompletaPort<Acabado> &
  BuscablePorNombrePort<Acabado> &
  RecursoCatalogoPort<Acabado, CrearAcabadoRequest, EditarAcabadoRequest, { nombre: string }>;

export type BasesRepositoryPort = ListaCompletaPort<Base> &
  BuscablePorNombrePort<Base> &
  RecursoCatalogoPort<Base, CrearBaseRequest, EditarBaseRequest, { nombre: string }>;

export type FamiliasColorRepositoryPort = ListaCompletaPort<FamiliaColor> &
  BuscablePorNombrePort<FamiliaColor> &
  RecursoCatalogoPort<FamiliaColor, CrearFamiliaColorRequest, EditarFamiliaColorRequest, { nombre: string }>;

export type TiposMedidaRepositoryPort = ListaCompletaPort<TipoMedida> &
  RecursoCatalogoPort<TipoMedida, CrearTipoMedidaRequest, EditarTipoMedidaRequest, { nombre: string }> & {
    /** La abreviatura también es única (R3). */
    existeAbreviatura(abreviatura: string, excluirId?: number): Promise<boolean>;
  };

/* ─── Marcas ─────────────────────────────────────────────────────────────── */

export interface CrearMarcaDatos {
  nombre: string;
  logotipo: Buffer;
  logotipoMimeType: Marca['logotipoMimeType'];
}

export interface LogotipoMarca {
  bytes: Buffer;
  mimeType: Marca['logotipoMimeType'];
}

export interface MarcasRepositoryPort
  extends RecursoCatalogoPort<Marca, CrearMarcaDatos, EditarMarcaRequest, { nombre: string }> {
  listar(query: ListarBaseRequest): Promise<Pagina<Marca>>;
  reemplazarLogotipo(id: number, logotipo: Buffer, mimeType: Marca['logotipoMimeType']): Promise<Marca>;
  obtenerLogotipo(id: number): Promise<LogotipoMarca | null>;
}

/* ─── Líneas ─────────────────────────────────────────────────────────────── */

export interface CrearLineaDatos {
  idMarca: number;
  nombre: string;
  gamaComercial: string | null;
}

export interface LineasRepositoryPort
  extends RecursoCatalogoPort<Linea, CrearLineaDatos, EditarLineaRequest, { idMarca: number; nombre: string }> {
  listar(query: ListarLineasRequest): Promise<Pagina<Linea>>;
}

/* ─── Medidas ────────────────────────────────────────────────────────────── */

export interface CrearMedidaDatos {
  idTipoMedida: number;
  valor: number;
  nombre: string;
}

export interface ClaveMedida {
  idTipoMedida: number;
  valor: number;
  nombre: string;
}

/** Cambios de una medida ya resueltos por el servicio (el nombre y el tipo finales). */
export interface EditarMedidaDatos {
  idTipoMedida: number;
  valor: number;
  nombre: string;
}

/** Bytes de una imagen con su tipo (medidas y marcas). */
export interface ImagenBytes {
  bytes: Buffer;
  mimeType: Marca['logotipoMimeType'];
}

export interface MedidasRepositoryPort
  extends RecursoCatalogoPort<Medida, CrearMedidaDatos, EditarMedidaDatos, ClaveMedida> {
  listar(query: ListarMedidasRequest): Promise<Pagina<Medida>>;
  reemplazarImagen(id: number, imagen: Buffer, mimeType: ImagenBytes['mimeType']): Promise<Medida>;
  quitarImagen(id: number): Promise<Medida>;
  obtenerImagen(id: number): Promise<ImagenBytes | null>;
}
