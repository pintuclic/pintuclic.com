import type {
  Combo,
  CrearComboRequest,
  EditarComboRequest,
  ListarCombosRequest,
} from '../dtos/m01-catalogo-entrega3.dto';
import type {
  MarcasRepositoryPort,
  MedidasRepositoryPort,
  Pagina,
  SubcategoriasRepositoryPort,
  TiposMedidaRepositoryPort,
} from '../interfaces/catalogo.interface';
import type { CombosRepositoryPort, CrearComboDatos, EditarComboDatos } from '../interfaces/combos.interface';
import type { ProductosRepositoryPort, VariantesRepositoryPort } from '../interfaces/productos.interface';
import { errores, esViolacionUnica, ServicioCatalogoBase } from './catalogo-base.service';

/** K2: el tipo de medida de la variante de un combo. */
const TIPO_MEDIDA_UNIDAD = 'unidad';

/** HU-CAT-13: combos como un producto con una sola variante (K1–K10). */
export class CombosService extends ServicioCatalogoBase {
  constructor(
    private readonly combos: CombosRepositoryPort,
    private readonly productos: ProductosRepositoryPort,
    private readonly variantes: VariantesRepositoryPort,
    private readonly marcas: MarcasRepositoryPort,
    private readonly subcategorias: SubcategoriasRepositoryPort,
    private readonly medidas: MedidasRepositoryPort,
    private readonly tiposMedida: TiposMedidaRepositoryPort,
  ) {
    super();
  }

  listar(query: ListarCombosRequest): Promise<Pagina<Combo>> {
    return this.combos.listar(query);
  }

  async obtener(idProducto: number): Promise<Combo> {
    return this.exigir(await this.combos.obtener(idProducto));
  }

  async crear(peticion: CrearComboRequest): Promise<Combo> {
    const marca = await this.marcas.obtener(peticion.idMarca);
    if (marca === null) throw errores.relacionInvalida('La marca no existe.', 'idMarca');
    if (marca.estado !== 'activo') throw errores.padreInactivo('la marca');
    await this.exigirSubcategoriaActiva(peticion.idSubcategoria);
    await this.exigirMedidaUnidad(peticion.idMedida);
    await this.exigirComplementaria(peticion.idMarca, peticion.idCategoriaComplementaria);
    if (await this.productos.existeDuplicado({ idMarca: peticion.idMarca, nombre: peticion.nombre })) {
      throw errores.duplicado('un producto con ese nombre en la marca', 'nombre');
    }
    if (peticion.sku !== undefined && (await this.variantes.existeSku(peticion.sku))) {
      throw errores.duplicado('una variante con ese SKU', 'sku');
    }
    const datos: CrearComboDatos = {
      idMarca: peticion.idMarca,
      idSubcategoria: peticion.idSubcategoria,
      nombre: peticion.nombre,
      descripcion: peticion.descripcion ?? null,
      idMedida: peticion.idMedida,
      precio: peticion.precio,
      sku: peticion.sku ?? null,
      excluidoDeDescuentos: peticion.excluidoDeDescuentos,
      idCategoriaComplementaria: peticion.idCategoriaComplementaria ?? null,
    };
    return this.combos.crear(datos).catch(traducirUnico);
  }

  async editar(idProducto: number, peticion: EditarComboRequest): Promise<Combo> {
    const actual = this.exigir(await this.combos.obtener(idProducto));
    if (peticion.idSubcategoria !== undefined && peticion.idSubcategoria !== actual.idSubcategoria) {
      await this.exigirSubcategoriaActiva(peticion.idSubcategoria);
    }
    if (
      peticion.idCategoriaComplementaria !== undefined &&
      peticion.idCategoriaComplementaria !== actual.idCategoriaComplementaria
    ) {
      await this.exigirComplementaria(actual.idMarca, peticion.idCategoriaComplementaria);
    }
    if (
      peticion.nombre !== undefined &&
      peticion.nombre.toLowerCase() !== actual.nombre.toLowerCase() &&
      (await this.productos.existeDuplicado({ idMarca: actual.idMarca, nombre: peticion.nombre }, idProducto))
    ) {
      throw errores.duplicado('un producto con ese nombre en la marca', 'nombre');
    }
    if (
      peticion.sku !== undefined &&
      peticion.sku.toLowerCase() !== actual.sku.toLowerCase() &&
      (await this.variantes.existeSku(peticion.sku, actual.idVariante))
    ) {
      throw errores.duplicado('una variante con ese SKU', 'sku');
    }
    const cambios: EditarComboDatos = {
      ...(peticion.idSubcategoria !== undefined ? { idSubcategoria: peticion.idSubcategoria } : {}),
      ...(peticion.nombre !== undefined ? { nombre: peticion.nombre } : {}),
      ...(peticion.descripcion !== undefined ? { descripcion: peticion.descripcion } : {}),
      ...(peticion.precio !== undefined ? { precio: peticion.precio } : {}),
      ...(peticion.sku !== undefined ? { sku: peticion.sku } : {}),
      ...(peticion.excluidoDeDescuentos !== undefined ? { excluidoDeDescuentos: peticion.excluidoDeDescuentos } : {}),
      ...(peticion.idCategoriaComplementaria !== undefined
        ? { idCategoriaComplementaria: peticion.idCategoriaComplementaria }
        : {}),
    };
    return this.combos.editar(idProducto, cambios).catch(traducirUnico);
  }

  private async exigirSubcategoriaActiva(idSubcategoria: number): Promise<void> {
    const subcategoria = await this.subcategorias.obtener(idSubcategoria);
    if (subcategoria === null) throw errores.relacionInvalida('La subcategoría no existe.', 'idSubcategoria');
    if (subcategoria.estado !== 'activo' || !(await this.subcategorias.padreActivo(idSubcategoria))) {
      throw errores.padreInactivo('la subcategoría o su categoría');
    }
  }

  /** K2: la variante del combo va en una medida de tipo "Unidad". */
  private async exigirMedidaUnidad(idMedida: number): Promise<void> {
    const medida = await this.medidas.obtener(idMedida);
    if (medida === null) throw errores.relacionInvalida('La medida no existe.', 'idMedida');
    if (medida.estado !== 'activo') throw errores.padreInactivo('la medida');
    const tipo = await this.tiposMedida.obtener(medida.idTipoMedida);
    if (tipo === null || tipo.nombre.trim().toLowerCase() !== TIPO_MEDIDA_UNIDAD) {
      throw errores.relacionInvalida('La medida de un combo debe ser de tipo Unidad.', 'idMedida');
    }
  }

  private async exigirComplementaria(idMarca: number, idCategoria: number | null | undefined): Promise<void> {
    if (idCategoria === undefined || idCategoria === null) return;
    const campo = await this.productos.verificarRelaciones({ idMarca, idCategoriaComplementaria: idCategoria });
    if (campo !== null) {
      throw errores.relacionInvalida(
        'La categoría complementaria no existe o está inactiva.',
        'idCategoriaComplementaria',
      );
    }
  }
}

/** Carrera entre dos peticiones con el mismo nombre o SKU: la base lo impide y aquí se explica. */
function traducirUnico(err: unknown): never {
  throw esViolacionUnica(err) ? errores.duplicado('un combo con ese nombre o SKU', 'nombre') : err;
}
