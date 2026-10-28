import type { ProductoPublicoTarjeta } from '../../m01-catalogo/dtos/m01-catalogo-productos.dto';
import type { BuscarProductosRequest } from '../../m02-busqueda/dtos/m02-busqueda.dto';
import type { BusquedaServicePort } from '../../m02-busqueda/interfaces/busqueda.interface';
import type { DimensionFiltro, FiltrosPropuestos } from '../dtos/cuestionario.dto';
import type { CatalogoPreviewPort } from '../interfaces/cuestionario.interface';

/**
 * Vista previa del cuestionario resuelta por la BÚSQUEDA DE M02 (R7).
 *
 * El botón del cuestionario lleva al catálogo de M02 con unos filtros; si M03 contara los
 * productos por su cuenta, el número que anuncia la vista previa y lo que la persona ve al
 * pulsar podrían no coincidir. Delegando en M02 son, por construcción, el mismo resultado.
 *
 * Además evita reimplementar las reglas finas de M02, como la de las familias cromáticas
 * (su B7: incluye los productos entonables, no solo los que traen el color de fábrica).
 *
 * El adaptador vive en M03 y M02 no se entera: `app.routes.ts` le pasa su servicio ya
 * cableado con los precios de M06 y las campañas de M14.
 */
export class BusquedaM02Adapter implements CatalogoPreviewPort {
  constructor(private readonly busqueda: BusquedaServicePort) {}

  async contarYMostrar(
    filtros: FiltrosPropuestos,
    limite: number,
  ): Promise<{ total: number; productos: ProductoPublicoTarjeta[] }> {
    const ids = (dimension: DimensionFiltro): number[] =>
      filtros.filtros.filter((f) => f.dimension === dimension).map((f) => f.idValor);

    const peticion: BuscarProductosRequest = {
      q: '',
      idCategoria: ids('categoria'),
      idSubcategoria: ids('subcategoria'),
      idMarca: [],
      idLinea: ids('linea'),
      idTipoResina: ids('tipo_resina'),
      idFamiliaColor: ids('familia_color'),
      idColor: [],
      idMedida: [],
      idSuperficie: ids('superficie'),
      ...(filtros.ambiente === null ? {} : { ambiente: filtros.ambiente }),
      ordenar: 'relevancia',
      pagina: 1,
      limite,
    };

    // Visitante anónimo: el cuestionario es público y no hay precios de empresa que aplicar.
    const pagina = await this.busqueda.buscarProductos(peticion, { idUsuario: null });

    return {
      total: pagina.total,
      // `ResultadoBusqueda` extiende la tarjeta pública de M01 con el patrocinio; se
      // entrega tal cual, que es lo que el contrato declara como `vistaPrevia`.
      productos: [...pagina.items],
    };
  }
}
