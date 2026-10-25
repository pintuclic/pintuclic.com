import type { CambiarEstadoRequest, ImpactoDesactivacion } from '../dtos/m01-catalogo.dto';
import type { CrearVarianteRequest, EditarVarianteRequest, Variante } from '../dtos/m01-catalogo-productos.dto';
import type { MedidasRepositoryPort } from '../interfaces/catalogo.interface';
import type {
  EditarVarianteDatos,
  ProductosRepositoryPort,
  VariantesRepositoryPort,
} from '../interfaces/productos.interface';
import { errores, esViolacionUnica, ServicioCatalogoBase } from './catalogo-base.service';

/** HU-CAT-03: variante = producto + medida, con su precio y existencia referencial (V1–V6). */
export class VariantesService extends ServicioCatalogoBase {
  constructor(
    private readonly variantes: VariantesRepositoryPort,
    private readonly productos: ProductosRepositoryPort,
    private readonly medidas: MedidasRepositoryPort,
  ) {
    super();
  }

  async crear(idProducto: number, peticion: CrearVarianteRequest): Promise<Variante> {
    const producto = this.exigir(await this.productos.obtener(idProducto));
    if (producto.esCombo) throw errores.comboSoloPorCombos();
    if (producto.estado !== 'activo') throw errores.padreInactivo('el producto');

    const medida = await this.medidas.obtener(peticion.idMedida);
    if (medida === null) throw errores.relacionInvalida('La medida no existe.', 'idMedida');
    if (medida.estado !== 'activo') throw errores.padreInactivo('la medida');

    if (
      await this.variantes.existeDuplicado({
        idProducto,
        idMedida: peticion.idMedida,
      })
    ) {
      throw errores.duplicado('una variante de este producto con esa medida', 'idMedida');
    }
    const sku = peticion.sku ?? null;
    if (sku !== null && (await this.variantes.existeSku(sku))) {
      throw errores.duplicado('una variante con ese SKU', 'sku');
    }
    const codigoProveedor = peticion.codigoProveedor ?? null;
    if (codigoProveedor !== null && (await this.variantes.existeCodigoProveedor(codigoProveedor))) {
      throw errores.duplicado('una variante con ese código de proveedor', 'codigoProveedor');
    }
    return this.variantes
      .crear({
        idProducto,
        idMedida: peticion.idMedida,
        precio: peticion.precio,
        sku,
        codigoProveedor,
      })
      .catch(traducirUnico);
  }

  async editar(id: number, peticion: EditarVarianteRequest): Promise<Variante> {
    const actual = this.exigir(await this.variantes.obtener(id));
    const producto = this.exigir(await this.productos.obtener(actual.idProducto));
    if (producto.esCombo) throw errores.comboSoloPorCombos();
    if (peticion.sku !== undefined && peticion.sku.toLowerCase() !== actual.sku.toLowerCase()) {
      if (await this.variantes.existeSku(peticion.sku, id)) throw errores.duplicado('una variante con ese SKU', 'sku');
    }
    if (
      peticion.codigoProveedor !== undefined &&
      peticion.codigoProveedor !== null &&
      (await this.variantes.existeCodigoProveedor(peticion.codigoProveedor, id))
    ) {
      throw errores.duplicado('una variante con ese código de proveedor', 'codigoProveedor');
    }
    const cambios: EditarVarianteDatos = {
      ...(peticion.precio !== undefined ? { precio: peticion.precio } : {}),
      ...(peticion.sku !== undefined ? { sku: peticion.sku } : {}),
      ...(peticion.codigoProveedor !== undefined ? { codigoProveedor: peticion.codigoProveedor } : {}),
    };
    return this.variantes.editar(id, cambios).catch(traducirUnico);
  }

  async cambiarEstado(id: number, peticion: CambiarEstadoRequest): Promise<Variante> {
    const actual = this.exigir(await this.variantes.obtener(id));
    return this.aplicarCambioEstado({
      actual,
      peticion,
      contarImpacto: () => this.variantes.contarImpacto(id),
      padreActivo: () => this.variantes.padreActivo(id),
      etiquetaPadre: 'el producto o la medida',
      cambiar: (estado) => this.variantes.cambiarEstado(id, estado),
    });
  }

  async impacto(id: number): Promise<ImpactoDesactivacion> {
    this.exigir(await this.variantes.obtener(id));
    return this.variantes.contarImpacto(id);
  }
}

function traducirUnico(err: unknown): never {
  throw esViolacionUnica(err)
    ? errores.duplicado('una variante con ese SKU, medida o código de proveedor', 'sku')
    : err;
}
