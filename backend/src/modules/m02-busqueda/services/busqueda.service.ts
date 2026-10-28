import type {
  BuscarColoresRequest,
  BuscarProductosRequest,
  BusquedaSinResultado,
  ColorBuscado,
  ContextoPrecio,
  ListarSinResultadoRequest,
  OpcionesFiltro,
  OpcionesFiltroRequest,
  ResultadoBusqueda,
} from '../dtos/m02-busqueda.dto';
import type {
  BusquedaRepositoryPort,
  BusquedaServicePort,
  PaginaResultado,
} from '../interfaces/busqueda.interface';
import { BusquedaRepository } from '../repositories/busqueda.repository';

export class BusquedaService implements BusquedaServicePort {
  constructor(private readonly repository: BusquedaRepositoryPort = new BusquedaRepository()) {}

  async buscarProductos(
    filtros: BuscarProductosRequest,
    contexto: ContextoPrecio,
  ): Promise<PaginaResultado<ResultadoBusqueda>> {
    const resultado = await this.repository.buscarProductos(filtros, contexto);

    // S2: Solo se registra cuando hay término, se pidió la PRIMERA página, no hay filtros aplicados y el total es 0.
    const tieneTermino = Boolean(filtros.q && filtros.q.trim().length > 0);
    const esPrimeraPagina = filtros.pagina === 1;
    const sinFiltrosAdicionales =
      (!filtros.idCategoria || filtros.idCategoria.length === 0) &&
      (!filtros.idSubcategoria || filtros.idSubcategoria.length === 0) &&
      (!filtros.idMarca || filtros.idMarca.length === 0) &&
      (!filtros.idLinea || filtros.idLinea.length === 0) &&
      (!filtros.idTipoResina || filtros.idTipoResina.length === 0) &&
      (!filtros.idFamiliaColor || filtros.idFamiliaColor.length === 0) &&
      (!filtros.idColor || filtros.idColor.length === 0) &&
      (!filtros.idMedida || filtros.idMedida.length === 0) &&
      (!filtros.idSuperficie || filtros.idSuperficie.length === 0) &&
      !filtros.ambiente &&
      filtros.precioMin === undefined &&
      filtros.precioMax === undefined;

    if (tieneTermino && esPrimeraPagina && sinFiltrosAdicionales && resultado.total === 0) {
      // S3: La escritura no bloquea ni falla la búsqueda
      void this.repository.registrarBusquedaSinResultado(filtros.q!);
    }

    return resultado;
  }

  async obtenerOpcionesFiltro(
    filtros: OpcionesFiltroRequest,
    contexto: ContextoPrecio,
  ): Promise<OpcionesFiltro> {
    return this.repository.obtenerOpcionesFiltro(filtros, contexto);
  }

  async buscarColores(
    filtros: BuscarColoresRequest,
  ): Promise<PaginaResultado<ColorBuscado>> {
    return this.repository.buscarColores(filtros);
  }

  async listarBusquedasSinResultado(
    filtros: ListarSinResultadoRequest,
  ): Promise<PaginaResultado<BusquedaSinResultado>> {
    return this.repository.listarBusquedasSinResultado(filtros);
  }
}
