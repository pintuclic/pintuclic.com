import type { CambiarEstadoRequest, ImpactoDesactivacion } from '../dtos/m01-catalogo.dto';
import type {
  CrearProductoRequest,
  EditarProductoRequest,
  ListarColoresProductoRequest,
  ListarProductosRequest,
  ProductoDetalle,
  ProductoResumen,
} from '../dtos/m01-catalogo-productos.dto';
import type {
  LineasRepositoryPort,
  MarcasRepositoryPort,
  Pagina,
  SubcategoriasRepositoryPort,
} from '../interfaces/catalogo.interface';
import type {
  CampoRelacion,
  ColoresDeProducto,
  CrearProductoDatos,
  EditarProductoDatos,
  FichaRecubrimientoDatos,
  ProductosRepositoryPort,
  RelacionesAVerificar,
} from '../interfaces/productos.interface';
import { errores, esViolacionUnica, ServicioCatalogoBase } from './catalogo-base.service';

const MENSAJES_RELACION: Record<CampoRelacion, string> = {
  idTipoResina: 'El tipo de resina no existe o está inactivo.',
  idCategoriaComplementaria: 'La categoría complementaria no existe o está inactiva.',
  idsSuperficies: 'Alguna superficie no existe o está inactiva.',
  idsAcabados: 'Algún acabado no existe o está inactivo.',
  idsBases: 'Alguna base no existe o está inactiva.',
  idsColoresFabrica: 'Algún color de fábrica no existe, está inactivo o no es de la marca del producto.',
};

const sinRepetidos = (nombres: readonly string[]): boolean =>
  new Set(nombres.map((n) => n.trim().toLowerCase())).size === nombres.length;

/** Estado final de un producto tras una creación o edición; sobre él se comprueban P2 y P3. */
interface EstadoFinal {
  idLinea: number | null;
  ficha: FichaRecubrimientoDatos | null;
  idsAcabados: readonly number[];
  idsBases: readonly number[];
  idsColoresFabrica: readonly number[];
  caracteristicas: ReadonlyArray<{ nombre: string }>;
}

/** HU-CAT-02, HU-CAT-09, HU-CAT-10, HU-CAT-12: productos con ficha, relaciones y publicación. */
export class ProductosService extends ServicioCatalogoBase {
  constructor(
    private readonly productos: ProductosRepositoryPort,
    private readonly marcas: MarcasRepositoryPort,
    private readonly lineas: LineasRepositoryPort,
    private readonly subcategorias: SubcategoriasRepositoryPort,
  ) {
    super();
  }

  listar(query: ListarProductosRequest): Promise<Pagina<ProductoResumen>> {
    return this.productos.listar(query);
  }

  async obtener(id: number): Promise<ProductoDetalle> {
    return this.exigir(await this.productos.obtener(id));
  }

  /* ─── Reglas entre campos (P2, P3) sobre el estado resultante ─── */

  private validarEstadoFinal(f: EstadoFinal): void {
    if (f.ficha !== null && f.idLinea === null) {
      throw errores.parametroInvalido('Un recubrimiento exige línea.');
    }
    if (f.ficha === null && (f.idsAcabados.length > 0 || f.idsBases.length > 0 || f.idsColoresFabrica.length > 0)) {
      throw errores.parametroInvalido('Acabados, bases y colores de fábrica exigen la ficha de recubrimiento.');
    }
    if (f.idsBases.length > 0 && f.idsAcabados.length === 0) {
      throw errores.parametroInvalido('Un producto con bases necesita al menos un acabado.');
    }
    if (!sinRepetidos(f.caracteristicas.map((c) => c.nombre))) {
      throw errores.parametroInvalido('Hay características con el nombre repetido.');
    }
  }

  private async exigirRelaciones(relaciones: RelacionesAVerificar): Promise<void> {
    const campo = await this.productos.verificarRelaciones(relaciones);
    if (campo !== null) throw errores.relacionInvalida(MENSAJES_RELACION[campo], campo);
  }

  /** P1: la línea existe, es de la marca y está activa. */
  private async exigirLinea(idLinea: number, idMarca: number): Promise<void> {
    const linea = await this.lineas.obtener(idLinea);
    if (linea === null || linea.idMarca !== idMarca) {
      throw errores.relacionInvalida('La línea no existe o no es de la marca del producto.', 'idLinea');
    }
    if (linea.estado !== 'activo') throw errores.padreInactivo('la línea');
  }

  private async exigirSubcategoriaActiva(idSubcategoria: number): Promise<void> {
    const subcategoria = await this.subcategorias.obtener(idSubcategoria);
    if (subcategoria === null) throw errores.relacionInvalida('La subcategoría no existe.', 'idSubcategoria');
    if (subcategoria.estado !== 'activo' || !(await this.subcategorias.padreActivo(idSubcategoria))) {
      throw errores.padreInactivo('la subcategoría o su categoría');
    }
  }

  /* ─── Alta ─── */

  async crear(peticion: CrearProductoRequest): Promise<ProductoDetalle> {
    const marca = await this.marcas.obtener(peticion.idMarca);
    if (marca === null) throw errores.relacionInvalida('La marca no existe.', 'idMarca');
    if (marca.estado !== 'activo') throw errores.padreInactivo('la marca');

    const datos: CrearProductoDatos = {
      idMarca: peticion.idMarca,
      idLinea: peticion.idLinea ?? null,
      idSubcategoria: peticion.idSubcategoria,
      nombre: peticion.nombre,
      descripcion: peticion.descripcion ?? null,
      usoInterior: peticion.usoInterior,
      usoExterior: peticion.usoExterior,
      idCategoriaComplementaria: peticion.idCategoriaComplementaria ?? null,
      patrocinado: peticion.patrocinado,
      ficha:
        peticion.ficha === null || peticion.ficha === undefined
          ? null
          : {
              idTipoResina: peticion.ficha.idTipoResina,
              tipoCalidad: peticion.ficha.tipoCalidad ?? null,
              rendimientoMin: peticion.ficha.rendimientoMin ?? null,
              rendimientoMax: peticion.ficha.rendimientoMax ?? null,
              manos: peticion.ficha.manos ?? null,
            },
      idsSuperficies: peticion.idsSuperficies,
      idsAcabados: peticion.idsAcabados,
      idsBases: peticion.idsBases,
      idsColoresFabrica: peticion.idsColoresFabrica,
      caracteristicas: peticion.caracteristicas,
    };
    this.validarEstadoFinal(datos);

    if (datos.idLinea !== null) await this.exigirLinea(datos.idLinea, datos.idMarca);
    await this.exigirSubcategoriaActiva(datos.idSubcategoria);
    await this.exigirRelaciones({
      idMarca: datos.idMarca,
      ...(datos.ficha !== null ? { idTipoResina: datos.ficha.idTipoResina } : {}),
      ...(datos.idCategoriaComplementaria !== null
        ? { idCategoriaComplementaria: datos.idCategoriaComplementaria }
        : {}),
      idsSuperficies: datos.idsSuperficies,
      idsAcabados: datos.idsAcabados,
      idsBases: datos.idsBases,
      idsColoresFabrica: datos.idsColoresFabrica,
    });
    if (
      await this.productos.existeDuplicado({
        idMarca: datos.idMarca,
        nombre: datos.nombre,
      })
    ) {
      throw errores.duplicado('un producto con ese nombre en la marca', 'nombre');
    }
    return this.productos.crear(datos).catch(traducirUnico);
  }

  /* ─── Edición ─── */

  async editar(id: number, peticion: EditarProductoRequest): Promise<ProductoDetalle> {
    const actual = this.exigir(await this.productos.obtener(id));
    if (actual.esCombo) throw errores.comboSoloPorCombos();

    const fichaFinal: FichaRecubrimientoDatos | null =
      peticion.ficha === undefined
        ? actual.ficha === null
          ? null
          : {
              idTipoResina: actual.ficha.idTipoResina,
              tipoCalidad: actual.ficha.tipoCalidad,
              rendimientoMin: actual.ficha.rendimientoMin,
              rendimientoMax: actual.ficha.rendimientoMax,
              manos: actual.ficha.manos,
            }
        : peticion.ficha === null
          ? null
          : {
              idTipoResina: peticion.ficha.idTipoResina,
              tipoCalidad: peticion.ficha.tipoCalidad ?? null,
              rendimientoMin: peticion.ficha.rendimientoMin ?? null,
              rendimientoMax: peticion.ficha.rendimientoMax ?? null,
              manos: peticion.ficha.manos ?? null,
            };
    const ids = (nuevos: number[] | undefined, previos: ReadonlyArray<{ id: number }>): readonly number[] =>
      nuevos ?? previos.map((r) => r.id);

    this.validarEstadoFinal({
      idLinea: peticion.idLinea !== undefined ? peticion.idLinea : actual.idLinea,
      ficha: fichaFinal,
      idsAcabados: ids(peticion.idsAcabados, actual.acabados),
      idsBases: ids(peticion.idsBases, actual.bases),
      idsColoresFabrica: ids(peticion.idsColoresFabrica, actual.coloresFabrica),
      caracteristicas: peticion.caracteristicas ?? actual.caracteristicas,
    });

    if (peticion.idLinea !== undefined && peticion.idLinea !== null && peticion.idLinea !== actual.idLinea) {
      await this.exigirLinea(peticion.idLinea, actual.idMarca);
    }
    if (peticion.idSubcategoria !== undefined && peticion.idSubcategoria !== actual.idSubcategoria) {
      await this.exigirSubcategoriaActiva(peticion.idSubcategoria);
    }
    // Solo se verifica lo nuevo: lo que el producto ya tenía puede haberse desactivado después.
    const soloNuevos = (
      enviados: number[] | undefined,
      previos: ReadonlyArray<{ id: number }>,
    ): number[] | undefined => {
      if (enviados === undefined) return undefined;
      const conocidos = new Set(previos.map((r) => r.id));
      return enviados.filter((x) => !conocidos.has(x));
    };
    const nuevaResina =
      peticion.ficha !== undefined &&
      peticion.ficha !== null &&
      peticion.ficha.idTipoResina !== actual.ficha?.idTipoResina
        ? peticion.ficha.idTipoResina
        : undefined;
    const nuevaComplementaria =
      peticion.idCategoriaComplementaria !== undefined &&
      peticion.idCategoriaComplementaria !== null &&
      peticion.idCategoriaComplementaria !== actual.idCategoriaComplementaria
        ? peticion.idCategoriaComplementaria
        : undefined;
    const idsSuperficies = soloNuevos(peticion.idsSuperficies, actual.superficies);
    const idsAcabados = soloNuevos(peticion.idsAcabados, actual.acabados);
    const idsBases = soloNuevos(peticion.idsBases, actual.bases);
    const idsColoresFabrica = soloNuevos(peticion.idsColoresFabrica, actual.coloresFabrica);
    await this.exigirRelaciones({
      idMarca: actual.idMarca,
      ...(nuevaResina !== undefined ? { idTipoResina: nuevaResina } : {}),
      ...(nuevaComplementaria !== undefined ? { idCategoriaComplementaria: nuevaComplementaria } : {}),
      ...(idsSuperficies !== undefined ? { idsSuperficies } : {}),
      ...(idsAcabados !== undefined ? { idsAcabados } : {}),
      ...(idsBases !== undefined ? { idsBases } : {}),
      ...(idsColoresFabrica !== undefined ? { idsColoresFabrica } : {}),
    });

    if (
      peticion.nombre !== undefined &&
      peticion.nombre.toLowerCase() !== actual.nombre.toLowerCase() &&
      (await this.productos.existeDuplicado({ idMarca: actual.idMarca, nombre: peticion.nombre }, id))
    ) {
      throw errores.duplicado('un producto con ese nombre en la marca', 'nombre');
    }

    const cambios: EditarProductoDatos = {
      ...(peticion.idLinea !== undefined ? { idLinea: peticion.idLinea } : {}),
      ...(peticion.idSubcategoria !== undefined ? { idSubcategoria: peticion.idSubcategoria } : {}),
      ...(peticion.nombre !== undefined ? { nombre: peticion.nombre } : {}),
      ...(peticion.descripcion !== undefined ? { descripcion: peticion.descripcion } : {}),
      ...(peticion.usoInterior !== undefined ? { usoInterior: peticion.usoInterior } : {}),
      ...(peticion.usoExterior !== undefined ? { usoExterior: peticion.usoExterior } : {}),
      ...(peticion.idCategoriaComplementaria !== undefined
        ? { idCategoriaComplementaria: peticion.idCategoriaComplementaria }
        : {}),
      ...(peticion.patrocinado !== undefined ? { patrocinado: peticion.patrocinado } : {}),
      ...(peticion.ficha !== undefined ? { ficha: fichaFinal } : {}),
      ...(peticion.idsSuperficies !== undefined ? { idsSuperficies: peticion.idsSuperficies } : {}),
      ...(peticion.idsAcabados !== undefined ? { idsAcabados: peticion.idsAcabados } : {}),
      ...(peticion.idsBases !== undefined ? { idsBases: peticion.idsBases } : {}),
      ...(peticion.idsColoresFabrica !== undefined ? { idsColoresFabrica: peticion.idsColoresFabrica } : {}),
      ...(peticion.caracteristicas !== undefined ? { caracteristicas: peticion.caracteristicas } : {}),
    };
    return this.productos.editar(id, cambios).catch(traducirUnico);
  }

  /* ─── Estado y publicación ─── */

  async cambiarEstado(id: number, peticion: CambiarEstadoRequest): Promise<ProductoDetalle> {
    const actual = this.exigir(await this.productos.obtener(id));
    return this.aplicarCambioEstado({
      actual,
      peticion,
      contarImpacto: () => this.productos.contarImpacto(id),
      padreActivo: () => this.productos.padreActivo(id),
      etiquetaPadre: 'la marca, la línea, la subcategoría o la categoría',
      cambiar: (estado) => this.productos.cambiarEstado(id, estado),
    });
  }

  async impacto(id: number): Promise<ImpactoDesactivacion> {
    this.exigir(await this.productos.obtener(id));
    return this.productos.contarImpacto(id);
  }

  /** P7: publicar exige producto activo y al menos una variante activa. Despublicar siempre se puede. */
  async publicar(id: number, publicado: boolean): Promise<ProductoDetalle> {
    const actual = this.exigir(await this.productos.obtener(id));
    if (actual.publicado === publicado) return actual;
    if (publicado) {
      if (actual.estado !== 'activo') {
        throw errores.noPublicable('No se puede publicar un producto inactivo.');
      }
      if ((await this.productos.contarVariantesActivas(id)) === 0) {
        throw errores.noPublicable('Un producto necesita al menos una variante activa para publicarse.');
      }
      if ((await this.productos.contarImagenes(id)) === 0) {
        throw errores.noPublicable('Un producto necesita al menos una imagen para publicarse.');
      }
    }
    return this.productos.cambiarPublicacion(id, publicado);
  }

  /* ─── P5 ─── */

  async listarColores(id: number, query: ListarColoresProductoRequest): Promise<ColoresDeProducto> {
    this.exigir(await this.productos.obtener(id));
    return this.productos.listarColores(id, query);
  }
}

function traducirUnico(err: unknown): never {
  throw esViolacionUnica(err) ? errores.duplicado('un producto con ese nombre en la marca', 'nombre') : err;
}
