import type { BuscarProductosRequest } from '../../m02-busqueda/dtos/m02-busqueda.dto';
import type { BusquedaServicePort } from '../../m02-busqueda/interfaces/busqueda.interface';
import type { ContextoCatalogoPort, ContextoDeConsulta } from '../services/asistente.service';

const sinFiltros = (): Pick<
  BuscarProductosRequest,
  | 'idCategoria'
  | 'idSubcategoria'
  | 'idMarca'
  | 'idLinea'
  | 'idTipoResina'
  | 'idFamiliaColor'
  | 'idColor'
  | 'idMedida'
  | 'idSuperficie'
> => ({
  idCategoria: [],
  idSubcategoria: [],
  idMarca: [],
  idLinea: [],
  idTipoResina: [],
  idFamiliaColor: [],
  idColor: [],
  idMedida: [],
  idSuperficie: [],
});

/**
 * H3 — de dónde salen los productos que el asistente puede mencionar.
 *
 * Es la LISTA CERRADA del contrato: se busca en el catálogo público con el mensaje de la
 * persona y solo esos productos se le entregan al modelo. Cualquier identificador que
 * devuelva fuera de esta lista se descarta después (D4).
 *
 * Se devuelven de una vez el resumen para el modelo y la tarjeta para la pantalla, de la
 * MISMA búsqueda: así no hay una segunda consulta ni riesgo de que las dos listas difieran.
 *
 * Se delega en la búsqueda de M02 para no reimplementar su relevancia ni sus reglas de
 * visibilidad. El adaptador vive en M03 y M02 no se entera.
 */
export class ContextoCatalogoAdapter implements ContextoCatalogoPort {
  constructor(private readonly busqueda: BusquedaServicePort) {}

  async buscarParaAsistente(texto: string, limite: number): Promise<ContextoDeConsulta> {
    const peticion: BuscarProductosRequest = {
      ...sinFiltros(),
      // M02 limita el largo del término; aquí solo orienta la búsqueda.
      q: texto.slice(0, 100),
      ordenar: 'relevancia',
      pagina: 1,
      limite,
    };

    const pagina = await this.busqueda.buscarProductos(peticion, { idUsuario: null });

    return {
      // Nada de precios ni existencias en lo que ve el modelo: no habla de eso (H4).
      resumen: pagina.items.map((p) => ({
        idProducto: p.idProducto,
        nombre: p.nombre,
        marca: p.marca,
        categoria: p.categoria,
        superficies: [],
        ambientes: [],
        rendimiento: null,
      })),
      tarjetas: new Map(pagina.items.map((p) => [p.idProducto, p])),
    };
  }
}
