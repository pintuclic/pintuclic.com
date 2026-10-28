import type { ProductoPublicoTarjeta } from '../../m01-catalogo/dtos/m01-catalogo-productos.dto';
import type {
  ConfiguracionAsesoria,
  CrearOpcionRequest,
  CrearPreguntaRequest,
  EditarConfiguracionRequest,
  EditarOpcionRequest,
  EditarPreguntaRequest,
  EfectoOpcion,
  FiltrosPropuestos,
  OpcionAdmin,
  PreguntaAdmin,
  ValorVocabulario,
} from '../dtos/cuestionario.dto';

/** Contratos de datos del cuestionario (HU-ASE-01). Solo tipos: cero runtime. */

/** Una familia cromática, que es la opción de una pregunta `familias_color` (F3). */
export interface FamiliaCromatica {
  idFamiliaColor: number;
  nombre: string;
  hexadecimal: string;
}

export interface CuestionarioRepositoryPort {
  /** Preguntas ACTIVAS con sus opciones y efectos activos, en orden (R2). */
  listarPublicas(): Promise<PreguntaAdmin[]>;
  /** Todo, incluidos los inactivos, para el panel (F1). */
  listarTodas(): Promise<PreguntaAdmin[]>;

  crearPregunta(datos: CrearPreguntaRequest): Promise<PreguntaAdmin>;
  editarPregunta(idPregunta: number, datos: EditarPreguntaRequest): Promise<PreguntaAdmin | null>;
  obtenerPregunta(idPregunta: number): Promise<PreguntaAdmin | null>;

  crearOpcion(idPregunta: number, datos: CrearOpcionRequest): Promise<OpcionAdmin | null>;
  editarOpcion(idOpcion: number, datos: EditarOpcionRequest): Promise<OpcionAdmin | null>;
  obtenerOpcion(idOpcion: number): Promise<OpcionAdmin | null>;

  /** Reemplaza el conjunto completo de efectos de una opción. */
  reemplazarEfectos(idOpcion: number, efectos: readonly EfectoOpcion[]): Promise<OpcionAdmin | null>;
}

export interface VocabularioRepositoryPort {
  /** Valores ACTIVOS del catálogo que se pueden filtrar (contrato · V1). */
  obtener(): Promise<ValorVocabulario[]>;
  /** Las familias cromáticas con su muestra, para las preguntas de color (F3). */
  obtenerFamilias(): Promise<FamiliaCromatica[]>;
}

export interface ConfiguracionRepositoryPort {
  obtener(): Promise<ConfiguracionAsesoria>;
  editar(datos: EditarConfiguracionRequest, idUsuario: number | null): Promise<ConfiguracionAsesoria>;
}

/**
 * La vista previa del resultado (R7) la resuelve M02, no M03.
 *
 * Es deliberado: si M03 contara los productos por su cuenta, el número de la vista previa y
 * lo que muestra el catálogo al pulsar el botón podrían no coincidir, y además habría que
 * reimplementar reglas finas de M02 como la de las familias cromáticas (su B7, que incluye
 * los productos entonables). El adaptador vive en M03 y M02 no se entera.
 */
export interface CatalogoPreviewPort {
  contarYMostrar(
    filtros: FiltrosPropuestos,
    limite: number,
  ): Promise<{ total: number; productos: ProductoPublicoTarjeta[] }>;
}
