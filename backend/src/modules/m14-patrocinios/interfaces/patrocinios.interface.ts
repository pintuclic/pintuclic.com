import type {
  CampaniaRequest,
  EntidadMedicion,
  EspacioPublicitario,
  Estado,
  ImagenAnuncioQuery,
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

/* ── Espacios publicitarios (E2) ─────────────────────────────────────────── */

export type VarianteImagen = ImagenAnuncioQuery['variante'];
export type TamanoImagen = ImagenAnuncioQuery['tamano'];

/** Un anuncio tal como lo guarda la base (fechas AAAA-MM-DD, hora de Colombia). */
export interface FilaAnuncio {
  idAnuncio: number;
  nombre: string;
  anunciante: string;
  espacio: EspacioPublicitario;
  textoAlternativo: string;
  enlace: string | null;
  estado: Estado;
  fechaInicio: string;
  fechaFin: string;
  orden: number;
  tieneImagenMovil: boolean;
  fechaCreacion: Date;
  fechaActualizacion: Date;
  actualizadoPor: string | null;
}

/** Los campos de un anuncio que no son imagen, ya validados (el enlace, normalizado). */
export interface DatosAnuncio {
  nombre: string;
  anunciante: string;
  espacio: EspacioPublicitario;
  textoAlternativo: string;
  enlace: string | null;
  fechaInicio: string;
  fechaFin: string;
  orden: number;
}

export interface MedidaImagen {
  bytes: Buffer;
  ancho: number;
  alto: number;
}

/** Una imagen subida ya comprobada: el original y las dos versiones reducidas en WEBP (B11). */
export interface ImagenPreparada {
  variante: VarianteImagen;
  /** Tipo del original; las versiones reducidas son siempre `image/webp`. */
  mimeType: string;
  original: MedidaImagen;
  pequeno: MedidaImagen;
  mediano: MedidaImagen;
}

export interface ImagenBytes {
  bytes: Buffer;
  mimeType: string;
}

export interface AnunciosRepositoryPort {
  listarTodos(): Promise<FilaAnuncio[]>;
  /** Los anuncios activos de un espacio cuya vigencia incluye `hoy`, por `orden` y luego por id (B4). */
  vigentes(espacio: EspacioPublicitario, hoy: string, limite: number): Promise<FilaAnuncio[]>;
  obtener(idAnuncio: number): Promise<FilaAnuncio | null>;
  crear(datos: DatosAnuncio, imagenes: readonly ImagenPreparada[], idUsuario: number): Promise<number>;
  /** Reemplaza los campos y las imágenes que vienen; `quitarMovil` borra la móvil. false si no existe. */
  reemplazar(
    idAnuncio: number,
    datos: Omit<DatosAnuncio, 'espacio'>,
    imagenes: readonly ImagenPreparada[],
    quitarMovil: boolean,
    idUsuario: number,
  ): Promise<boolean>;
  cambiarEstado(idAnuncio: number, estado: Estado, idUsuario: number): Promise<boolean>;
  imagen(idAnuncio: number, variante: VarianteImagen, tamano: TamanoImagen): Promise<ImagenBytes | null>;
}

/* ── Medición (E2) ───────────────────────────────────────────────────────── */

export type EventoDeMedicion = 'impresion' | 'clic';

/** Un total diario tal como se guarda. `lugar` es la ubicación de la campaña o el espacio del anuncio. */
export interface RegistroMedicion {
  fecha: string;
  entidad: EntidadMedicion;
  idEntidad: number;
  lugar: string;
  evento: EventoDeMedicion;
  total: number;
}

export interface SumaMedicion {
  entidad: EntidadMedicion;
  idEntidad: number;
  lugar: string;
  evento: EventoDeMedicion;
  total: number;
}

export interface MedicionRepositoryPort {
  /** Suma los totales al día indicado; si no había fila, la crea (sin carreras). */
  sumar(fecha: string, sumas: readonly SumaMedicion[]): Promise<void>;
  /** Totales diarios entre dos fechas inclusive, de todo o de una entidad. */
  leer(desde: string, hasta: string, filtro?: { entidad?: EntidadMedicion; idEntidad?: number }): Promise<RegistroMedicion[]>;
}
