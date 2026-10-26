import type {
  CampaniaRequest,
  Estado,
  ObjetivoPatrocinio,
  PatrocinioPort,
  ProductoPublicoTarjetaPatrocinio,
  TipoObjetivoPatrocinio,
  UbicacionPatrocinio,
} from '../dtos/m14-patrocinios.dto';

export type { PatrocinioPort };

export interface Pagina<T> {
  items: T[];
  total: number;
}

/** Una campaña tal como la guarda la base (fechas AAAA-MM-DD, hora de Colombia). */
export interface FilaCampania {
  idCampania: number;
  nombre: string;
  descripcion: string | null;
  estado: Estado;
  fechaInicio: string;
  fechaFin: string;
  prioridad: number;
  ubicaciones: UbicacionPatrocinio[];
  objetivos: ObjetivoPatrocinio[];
  fechaCreacion: Date;
  fechaActualizacion: Date;
  actualizadoPor: string | null;
}

export interface CampaniasRepositoryPort {
  listarTodas(): Promise<FilaCampania[]>;
  /** Activas cuya `fechaFin` es hoy o posterior (las que pueden estar vigentes). */
  listarActivasDesde(hoy: string): Promise<FilaCampania[]>;
  obtener(idCampania: number): Promise<FilaCampania | null>;
  /** true si ya hay otra campaña con ese nombre (sin distinguir mayúsculas ni espacios de los bordes). */
  nombreExiste(nombre: string, exceptoId?: number): Promise<boolean>;
  crear(datos: CampaniaRequest, idUsuario: number): Promise<number>;
  /** false si no existe. */
  reemplazar(idCampania: number, datos: CampaniaRequest, idUsuario: number): Promise<boolean>;
  cambiarEstado(idCampania: number, estado: Estado, idUsuario: number): Promise<boolean>;
}

/** Un producto del catálogo con lo que hace falta para saber si una campaña lo cubre y para mostrarlo en el panel. */
export interface ProductoDeCatalogo {
  idProducto: number;
  idMarca: number;
  idLinea: number | null;
  nombre: string;
  marca: string;
  linea: string | null;
  subcategoria: string;
  /** Se mostraría hoy en el catálogo público (regla de visibilidad de M01). */
  visible: boolean;
}

/** Lectura del catálogo de M01 (solo lectura). */
export interface CatalogoPatrocinioRepositoryPort {
  buscar(tipo: TipoObjetivoPatrocinio, busqueda: string, limite: number): Promise<Array<{ id: number; nombre: string }>>;
  /** Nombre de cada objetivo y los que ya no existen (en cualquier estado). */
  nombrar(objetivos: readonly ObjetivoPatrocinio[]): Promise<{
    nombres: Map<string, string>;
    inexistentes: ObjetivoPatrocinio[];
  }>;
  /** Todos los productos que cubren esos objetivos, visibles o no. */
  productosDeObjetivos(objetivos: readonly ObjetivoPatrocinio[]): Promise<ProductoDeCatalogo[]>;
  /** De esos ids, los que se mostrarían hoy. */
  idsVisibles(idsProducto: readonly number[]): Promise<Set<number>>;
}

/** Lo que M14 necesita de M01 (la implementa M01). */
export interface TarjetasPublicasPort {
  tarjetasPublicas(idsProducto: readonly number[]): Promise<ProductoPublicoTarjetaPatrocinio[]>;
}
