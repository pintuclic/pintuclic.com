import type {
  CategoriaPublica,
  FiltrosPublicos,
  ListarColoresProductoRequest,
  ListarProductosPublicosRequest,
  ProductoPublicoFicha,
  ProductoPublicoTarjeta,
} from '../dtos/m01-catalogo-productos.dto';
import type { ImagenBytes, LogotipoMarca, Pagina } from '../interfaces/catalogo.interface';
import type { ConsultaPublicaRepositoryPort } from '../interfaces/consulta-publica.interface';
import type { ColoresDeProducto } from '../interfaces/productos.interface';
import { errores, ServicioCatalogoBase } from './catalogo-base.service';

/** HU-CAT-06: consulta pública. Lo que no es visible responde 404 uniforme (U1). */
export class ConsultaPublicaService extends ServicioCatalogoBase {
  constructor(private readonly consulta: ConsultaPublicaRepositoryPort) {
    super();
  }

  categorias(): Promise<CategoriaPublica[]> {
    return this.consulta.categorias();
  }

  filtros(): Promise<FiltrosPublicos> {
    return this.consulta.filtros();
  }

  listar(query: ListarProductosPublicosRequest): Promise<Pagina<ProductoPublicoTarjeta>> {
    return this.consulta.listar(query);
  }

  async ficha(idProducto: number): Promise<ProductoPublicoFicha> {
    return this.exigir(await this.consulta.ficha(idProducto));
  }

  async colores(idProducto: number, query: ListarColoresProductoRequest): Promise<ColoresDeProducto> {
    return this.exigir(await this.consulta.colores(idProducto, query));
  }

  async imagen(idImagen: number): Promise<ImagenBytes> {
    return this.exigir(await this.consulta.imagen(idImagen));
  }

  async imagenMedida(idMedida: number): Promise<ImagenBytes> {
    return this.exigir(await this.consulta.imagenMedida(idMedida));
  }

  async logotipo(idMarca: number): Promise<LogotipoMarca> {
    const logotipo = await this.consulta.logotipo(idMarca);
    if (logotipo === null) throw errores.noDisponible();
    return logotipo;
  }
}
