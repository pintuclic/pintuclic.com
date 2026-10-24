import {
  ACABADO_POR_DEFECTO,
  type Acabado,
  type CambiarEstadoRequest,
  type CrearAcabadoRequest,
  type CrearTipoMedidaRequest,
  type EditarAcabadoRequest,
  type EditarTipoMedidaRequest,
  type Estado,
  type ImpactoDesactivacion,
  type ListarCompletoRequest,
  type TipoMedida,
} from '../dtos/m01-catalogo.dto';
import type {
  AcabadosRepositoryPort,
  ListaCompletaPort,
  RecursoCatalogoPort,
  TiposMedidaRepositoryPort,
} from '../interfaces/catalogo.interface';
import { errores, ServicioCatalogoBase } from './catalogo-base.service';

type PuertoSimple<E extends { estado: Estado }, C, U> = ListaCompletaPort<E> &
  RecursoCatalogoPort<E, C, U, { nombre: string }>;

/**
 * Catálogos pequeños sin padre ni paginación (D5): superficies, tipos de resina,
 * acabados, bases, familias de color y tipos de medida. Cada subclase añade, si las
 * hay, sus reglas propias en los ganchos `antesDeEditar` y `antesDeDesactivar`.
 */
export class CatalogoSimpleService<
  E extends { estado: Estado; nombre: string },
  C extends { nombre: string },
  U extends { nombre?: string | undefined },
> extends ServicioCatalogoBase {
  constructor(
    protected readonly repo: PuertoSimple<E, C, U>,
    /** Cómo se nombra en los mensajes: "una superficie", "un acabado"… */
    private readonly etiqueta: string,
  ) {
    super();
  }

  listar(query: ListarCompletoRequest): Promise<E[]> {
    return this.repo.listar(query);
  }

  /** Gancho: validaciones propias antes de crear. */
  protected async antesDeCrear(_datos: C): Promise<void> {}
  /** Gancho: validaciones propias antes de editar. */
  protected async antesDeEditar(_actual: E, _datos: U): Promise<void> {}
  /** Gancho: validaciones propias antes de desactivar. */
  protected antesDeDesactivar(_actual: E): void {}

  async crear(datos: C): Promise<E> {
    await this.exigirNombreLibre(this.repo.existeDuplicado({ nombre: datos.nombre }), this.etiqueta);
    await this.antesDeCrear(datos);
    return this.repo.crear(datos);
  }

  async editar(id: number, datos: U): Promise<E> {
    const actual = this.exigir(await this.repo.obtener(id));
    if (datos.nombre !== undefined) {
      await this.exigirNombreLibre(this.repo.existeDuplicado({ nombre: datos.nombre }, id), this.etiqueta);
    }
    await this.antesDeEditar(actual, datos);
    return this.repo.editar(id, datos);
  }

  async cambiarEstado(id: number, peticion: CambiarEstadoRequest): Promise<E> {
    const actual = this.exigir(await this.repo.obtener(id));
    if (peticion.estado === 'inactivo') {
      this.antesDeDesactivar(actual);
    }
    return this.aplicarCambioEstado({
      actual,
      peticion,
      contarImpacto: () => this.repo.contarImpacto(id),
      padreActivo: () => this.repo.padreActivo(id),
      etiquetaPadre: 'el padre',
      cambiar: (estado) => this.repo.cambiarEstado(id, estado),
    });
  }

  async impacto(id: number): Promise<ImpactoDesactivacion> {
    this.exigir(await this.repo.obtener(id));
    return this.repo.contarImpacto(id);
  }
}

const mismoNombre = (a: string, b: string): boolean => a.trim().toLowerCase() === b.trim().toLowerCase();

/** R11: el acabado por defecto (Brillante) no se renombra ni se desactiva. */
export class AcabadosService extends CatalogoSimpleService<Acabado, CrearAcabadoRequest, EditarAcabadoRequest> {
  constructor(repo: AcabadosRepositoryPort) {
    super(repo, 'un acabado');
  }

  protected override async antesDeEditar(actual: Acabado, datos: EditarAcabadoRequest): Promise<void> {
    if (
      mismoNombre(actual.nombre, ACABADO_POR_DEFECTO) &&
      datos.nombre !== undefined &&
      !mismoNombre(datos.nombre, ACABADO_POR_DEFECTO)
    ) {
      throw errores.acabadoProtegido();
    }
  }

  protected override antesDeDesactivar(actual: Acabado): void {
    if (mismoNombre(actual.nombre, ACABADO_POR_DEFECTO)) {
      throw errores.acabadoProtegido();
    }
  }
}

/** R3: además del nombre, la abreviatura de un tipo de medida es única. */
export class TiposMedidaService extends CatalogoSimpleService<
  TipoMedida,
  CrearTipoMedidaRequest,
  EditarTipoMedidaRequest
> {
  constructor(private readonly tipos: TiposMedidaRepositoryPort) {
    super(tipos, 'un tipo de medida');
  }

  protected override async antesDeCrear(datos: CrearTipoMedidaRequest): Promise<void> {
    await this.exigirNombreLibre(this.tipos.existeAbreviatura(datos.abreviatura), 'un tipo de medida con esa abreviatura');
  }

  protected override async antesDeEditar(actual: TipoMedida, datos: EditarTipoMedidaRequest): Promise<void> {
    if (datos.abreviatura !== undefined) {
      await this.exigirNombreLibre(
        this.tipos.existeAbreviatura(datos.abreviatura, actual.idTipoMedida),
        'un tipo de medida con esa abreviatura',
      );
    }
  }
}
