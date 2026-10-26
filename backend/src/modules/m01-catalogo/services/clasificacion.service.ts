import type {
  CambiarEstadoRequest,
  Categoria,
  CrearCategoriaRequest,
  CrearSubcategoriaRequest,
  EditarCategoriaRequest,
  EditarSubcategoriaRequest,
  ImpactoDesactivacion,
  ListarCompletoRequest,
  Subcategoria,
} from '../dtos/m01-catalogo.dto';
import type { CategoriasRepositoryPort, SubcategoriasRepositoryPort } from '../interfaces/catalogo.interface';
import { errores, ServicioCatalogoBase } from './catalogo-base.service';

/** HU-CAT-01: categorías y subcategorías (solo dos niveles, R1). */
export class ClasificacionService extends ServicioCatalogoBase {
  constructor(
    private readonly categorias: CategoriasRepositoryPort,
    private readonly subcategorias: SubcategoriasRepositoryPort,
  ) {
    super();
  }

  /* ─── Categorías ─── */

  listar(query: ListarCompletoRequest): Promise<Categoria[]> {
    return this.categorias.listar(query);
  }

  async crear(datos: CrearCategoriaRequest): Promise<Categoria> {
    await this.exigirNombreLibre(this.categorias.existeDuplicado({ nombre: datos.nombre }), 'una categoría');
    return this.categorias.crear(datos);
  }

  async editar(id: number, datos: EditarCategoriaRequest): Promise<Categoria> {
    this.exigir(await this.categorias.obtener(id));
    if (datos.nombre !== undefined) {
      await this.exigirNombreLibre(this.categorias.existeDuplicado({ nombre: datos.nombre }, id), 'una categoría');
    }
    return this.categorias.editar(id, datos);
  }

  async cambiarEstado(id: number, peticion: CambiarEstadoRequest): Promise<Categoria> {
    const actual = this.exigir(await this.categorias.obtener(id));
    return this.aplicarCambioEstado({
      actual,
      peticion,
      contarImpacto: () => this.conReglasComerciales(this.categorias.contarImpacto(id), { tipo: 'categoria', id }),
      padreActivo: () => this.categorias.padreActivo(id),
      etiquetaPadre: 'el padre',
      cambiar: (estado) => this.categorias.cambiarEstado(id, estado),
    });
  }

  async impacto(id: number): Promise<ImpactoDesactivacion> {
    this.exigir(await this.categorias.obtener(id));
    return this.conReglasComerciales(this.categorias.contarImpacto(id), { tipo: 'categoria', id });
  }

  /* ─── Subcategorías ─── */

  /** R8: no se crea bajo una categoría inactiva. */
  async crearSubcategoria(idCategoria: number, datos: CrearSubcategoriaRequest): Promise<Subcategoria> {
    const categoria = this.exigir(await this.categorias.obtener(idCategoria));
    if (categoria.estado !== 'activo') {
      throw errores.padreInactivo('la categoría');
    }
    await this.exigirNombreLibre(
      this.subcategorias.existeDuplicado({ idCategoria, nombre: datos.nombre }),
      'una subcategoría en esa categoría',
    );
    await this.exigirCategoriaComplementaria(datos.idCategoriaComplementaria);
    return this.subcategorias.crear({ ...datos, idCategoria });
  }

  async editarSubcategoria(id: number, datos: EditarSubcategoriaRequest): Promise<Subcategoria> {
    const actual = this.exigir(await this.subcategorias.obtener(id));
    if (datos.nombre !== undefined) {
      await this.exigirNombreLibre(
        this.subcategorias.existeDuplicado({ idCategoria: actual.idCategoria, nombre: datos.nombre }, id),
        'una subcategoría en esa categoría',
      );
    }
    await this.exigirCategoriaComplementaria(datos.idCategoriaComplementaria);
    return this.subcategorias.editar(id, datos);
  }

  /** Entrega 3 (D6): la categoría de la que se sugieren complementarios debe existir y estar activa. */
  private async exigirCategoriaComplementaria(id: number | null | undefined): Promise<void> {
    if (id === undefined || id === null) return;
    const categoria = await this.categorias.obtener(id);
    if (categoria === null || categoria.estado !== 'activo') {
      throw errores.relacionInvalida(
        'La categoría complementaria no existe o está inactiva.',
        'idCategoriaComplementaria',
      );
    }
  }

  async cambiarEstadoSubcategoria(id: number, peticion: CambiarEstadoRequest): Promise<Subcategoria> {
    const actual = this.exigir(await this.subcategorias.obtener(id));
    return this.aplicarCambioEstado({
      actual,
      peticion,
      contarImpacto: () => this.conReglasComerciales(this.subcategorias.contarImpacto(id), { tipo: 'subcategoria', id }),
      padreActivo: () => this.subcategorias.padreActivo(id),
      etiquetaPadre: 'la categoría',
      cambiar: (estado) => this.subcategorias.cambiarEstado(id, estado),
    });
  }

  async impactoSubcategoria(id: number): Promise<ImpactoDesactivacion> {
    this.exigir(await this.subcategorias.obtener(id));
    return this.conReglasComerciales(this.subcategorias.contarImpacto(id), { tipo: 'subcategoria', id });
  }
}
