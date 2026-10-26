import type {
  BuscarColoresRequest,
  BuscarProductosRequest,
  ColorBuscado,
  ListarSinResultadoRequest,
  OpcionesFiltro,
  OpcionesFiltroRequest,
  ResultadoBusqueda,
  BusquedaSinResultado,
  ContextoPrecio,
} from '../dtos/m02-busqueda.dto';

export interface PaginaResultado<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly pagina: number;
  readonly limite: number;
  readonly totalPaginas: number;
}

export interface BusquedaRepositoryPort {
  buscarProductos(
    filtros: BuscarProductosRequest,
    contexto: ContextoPrecio,
  ): Promise<PaginaResultado<ResultadoBusqueda>>;

  obtenerOpcionesFiltro(
    filtros: OpcionesFiltroRequest,
    contexto: ContextoPrecio,
  ): Promise<OpcionesFiltro>;

  buscarColores(
    filtros: BuscarColoresRequest,
  ): Promise<PaginaResultado<ColorBuscado>>;

  registrarBusquedaSinResultado(termino: string): Promise<void>;

  listarBusquedasSinResultado(
    filtros: ListarSinResultadoRequest,
  ): Promise<PaginaResultado<BusquedaSinResultado>>;
}

export interface BusquedaServicePort {
  buscarProductos(
    filtros: BuscarProductosRequest,
    contexto: ContextoPrecio,
  ): Promise<PaginaResultado<ResultadoBusqueda>>;

  obtenerOpcionesFiltro(
    filtros: OpcionesFiltroRequest,
    contexto: ContextoPrecio,
  ): Promise<OpcionesFiltro>;

  buscarColores(
    filtros: BuscarColoresRequest,
  ): Promise<PaginaResultado<ColorBuscado>>;

  listarBusquedasSinResultado(
    filtros: ListarSinResultadoRequest,
  ): Promise<PaginaResultado<BusquedaSinResultado>>;
}
