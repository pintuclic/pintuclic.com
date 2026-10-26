import { MAXIMO_COMPLEMENTARIOS, type Complementario, type TamanoImagen } from '../dtos/m01-catalogo-entrega3.dto';
import { listarProductosPublicosRequestSchema } from '../dtos/m01-catalogo-productos.dto';
import type {
  CategoriaPublica,
  OfertaPublica,
  OfertaVariante,
  OfertasProductoRequest,
  FiltrosPublicos,
  ListarColoresProductoRequest,
  ListarProductosPublicosRequest,
  ProductoPublicoFicha,
  ProductoPublicoTarjeta,
} from '../dtos/m01-catalogo-productos.dto';
import type { ImagenBytes, LogotipoMarca, Pagina } from '../interfaces/catalogo.interface';
import type { ConsultaPublicaRepositoryPort } from '../interfaces/consulta-publica.interface';
import type { OfertaPort, OfertasPort } from '../interfaces/ofertas.port';
import type { PatrocinioPort, PrioridadProductoPort } from '../interfaces/patrocinio.port';
import type { ColoresDeProducto } from '../interfaces/productos.interface';
import { errores, ServicioCatalogoBase } from './catalogo-base.service';
import { servirImagen } from './imagen-derivadas';

/** Tope de una consulta de tarjetas por ids (el máximo del límite de página). */
const MAXIMO_TARJETAS_POR_CONSULTA = 100;

const aOfertaPublica = (o: OfertaPort | null): OfertaPublica | null =>
  o === null ? null : { nombre: o.nombre, porcentaje: o.porcentaje, precioAntes: o.precioAntes, precioConOferta: o.precioConOferta };

/**
 * HU-CAT-06: consulta pública. Lo que no es visible responde 404 uniforme (U1). Las ofertas (eventos de M06) se
 * agregan si hay con quién pedirlas; si M06 falla, el catálogo se ve igual, sin ofertas.
 */
export class ConsultaPublicaService extends ServicioCatalogoBase {
  constructor(
    private readonly consulta: ConsultaPublicaRepositoryPort,
    private readonly ofertas?: OfertasPort,
    private readonly patrocinio?: PatrocinioPort,
  ) {
    super();
  }

  /** Pone la oferta de cada tarjeta; sin M06 o ante un fallo de M06 quedan sin oferta. */
  private async conOfertas(tarjetas: ProductoPublicoTarjeta[]): Promise<ProductoPublicoTarjeta[]> {
    if (this.ofertas === undefined || tarjetas.length === 0) return tarjetas;
    try {
      const porProducto = new Map(
        (await this.ofertas.ofertasDeProductos(tarjetas.map((t) => t.idProducto))).map((o) => [o.idProducto, o.oferta]),
      );
      return tarjetas.map((t) => ({ ...t, oferta: aOfertaPublica(porProducto.get(t.idProducto) ?? null) }));
    } catch {
      return tarjetas;
    }
  }

  categorias(): Promise<CategoriaPublica[]> {
    return this.consulta.categorias();
  }

  filtros(): Promise<FiltrosPublicos> {
    return this.consulta.filtros();
  }

  /** `enOferta`: solo los productos con una oferta en curso ahora. Sin M06 no hay ofertas: lista vacía. */
  async listar(query: ListarProductosPublicosRequest): Promise<Pagina<ProductoPublicoTarjeta>> {
    const pagina =
      query.enOferta === true
        ? await this.consulta.listar(query, this.ofertas === undefined ? [] : await this.ofertas.idsProductosEnOferta())
        : await this.consulta.listar(query);
    return { ...pagina, items: await this.conOfertas(pagina.items) };
  }

  /**
   * Las tarjetas públicas de esos productos, con su oferta, en el mismo orden. Los que no se muestran (inactivos, sin
   * publicar o con un padre inactivo) se omiten. Lo usa M14 para el bloque de productos patrocinados.
   */
  async tarjetasPublicas(idsProducto: readonly number[]): Promise<ProductoPublicoTarjeta[]> {
    const ids = [...new Set(idsProducto)].slice(0, MAXIMO_TARJETAS_POR_CONSULTA);
    if (ids.length === 0) return [];
    const pagina = await this.consulta.listar(
      listarProductosPublicosRequestSchema.parse({ pagina: 1, limite: ids.length }),
      ids,
    );
    const porId = new Map(pagina.items.map((t) => [t.idProducto, t]));
    const enOrden = ids.flatMap((id) => {
      const tarjeta = porId.get(id);
      return tarjeta === undefined ? [] : [tarjeta];
    });
    return this.conOfertas(enOrden);
  }

  async ficha(idProducto: number): Promise<ProductoPublicoFicha> {
    const ficha = this.exigir(await this.consulta.ficha(idProducto));
    if (this.ofertas === undefined || ficha.variantes.length === 0) return ficha;
    try {
      const porVariante = new Map(
        (await this.ofertas.preciosDeVariantes(ficha.variantes.map((v) => ({ idVariante: v.idVariante })))).map((o) => [
          o.idVariante,
          o.oferta,
        ]),
      );
      return { ...ficha, variantes: ficha.variantes.map((v) => ({ ...v, oferta: aOfertaPublica(porVariante.get(v.idVariante) ?? null) })) };
    } catch {
      return ficha;
    }
  }

  /**
   * La oferta de cada variante con el color elegido: las excepciones por color (p. ej. "el blanco no entra")
   * solo se pueden evaluar sabiendo el color.
   */
  async ofertasProducto(idProducto: number, query: OfertasProductoRequest): Promise<OfertaVariante[]> {
    const ficha = this.exigir(await this.consulta.ficha(idProducto));
    if (this.ofertas === undefined) return ficha.variantes.map((v) => ({ idVariante: v.idVariante, oferta: null }));
    try {
      const respuesta = await this.ofertas.preciosDeVariantes(
        ficha.variantes.map((v) => ({ idVariante: v.idVariante, idColor: query.idColor ?? null })),
      );
      return respuesta.map((o) => ({ idVariante: o.idVariante, oferta: aOfertaPublica(o.oferta) }));
    } catch {
      return ficha.variantes.map((v) => ({ idVariante: v.idVariante, oferta: null }));
    }
  }

  async colores(idProducto: number, query: ListarColoresProductoRequest): Promise<ColoresDeProducto> {
    return this.exigir(await this.consulta.colores(idProducto, query));
  }

  async imagen(idImagen: number, tamano: TamanoImagen = 'original'): Promise<ImagenBytes> {
    return this.exigir(
      await servirImagen(tamano, {
        original: () => this.consulta.imagen(idImagen),
        derivada: (t) => this.consulta.imagenDerivada(idImagen, t),
        guardar: (t, bytes) => this.consulta.guardarDerivada(idImagen, t, bytes),
      }),
    );
  }

  /** X1–X5: hasta 4 sugerencias para la ficha; vacío cuando no hay nada que sugerir (la pantalla oculta la sección). */
  async complementarios(idProducto: number): Promise<Complementario[]> {
    const deCampanias = await this.patrocinadosPorCampania();
    const campania = new Map(deCampanias.map((p) => [p.idProducto, p.idCampania]));
    const tarjetas = await this.conOfertas(
      this.exigir(await this.consulta.complementarios(idProducto, MAXIMO_COMPLEMENTARIOS, deCampanias)),
    );
    return tarjetas.map((t) => ({ ...t, patrocinado: campania.has(t.idProducto), idCampania: campania.get(t.idProducto) ?? null }));
  }

  /** Los productos de campañas vigentes de M14 para los complementarios; si M14 falla, la ficha se ve igual. */
  private async patrocinadosPorCampania(): Promise<PrioridadProductoPort[]> {
    if (this.patrocinio === undefined) return [];
    try {
      return await this.patrocinio.prioridadesDeProductos('complementarios');
    } catch {
      return [];
    }
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
