import type {
  CambiarEstadoRequest,
  CrearLineaRequest,
  EditarLineaRequest,
  ImpactoDesactivacion,
  Linea,
  ListarLineasRequest,
} from '../dtos/m01-catalogo.dto';
import type { LineasRepositoryPort, MarcasRepositoryPort, Pagina } from '../interfaces/catalogo.interface';
import { errores, ServicioCatalogoBase } from './catalogo-base.service';

/** La gama comercial vacía se guarda como null. */
const gamaONulo = (gama: string | null | undefined): string | null =>
  gama === undefined || gama === null || gama.trim() === '' ? null : gama.trim();

/** HU-CAT-11: líneas comerciales de una marca. */
export class LineasService extends ServicioCatalogoBase {
  constructor(
    private readonly lineas: LineasRepositoryPort,
    private readonly marcas: MarcasRepositoryPort,
  ) {
    super();
  }

  listar(query: ListarLineasRequest): Promise<Pagina<Linea>> {
    return this.lineas.listar(query);
  }

  /** R8: no se crea una línea bajo una marca inactiva. */
  async crear(datos: CrearLineaRequest): Promise<Linea> {
    const marca = this.exigir(await this.marcas.obtener(datos.idMarca));
    if (marca.estado !== 'activo') {
      throw errores.padreInactivo('la marca');
    }
    await this.exigirNombreLibre(
      this.lineas.existeDuplicado({ idMarca: datos.idMarca, nombre: datos.nombre }),
      'una línea en esa marca',
    );
    return this.lineas.crear({
      idMarca: datos.idMarca,
      nombre: datos.nombre,
      gamaComercial: gamaONulo(datos.gamaComercial),
    });
  }

  async editar(id: number, datos: EditarLineaRequest): Promise<Linea> {
    const actual = this.exigir(await this.lineas.obtener(id));
    if (datos.nombre !== undefined) {
      await this.exigirNombreLibre(
        this.lineas.existeDuplicado({ idMarca: actual.idMarca, nombre: datos.nombre }, id),
        'una línea en esa marca',
      );
    }
    return this.lineas.editar(id, {
      ...(datos.nombre !== undefined ? { nombre: datos.nombre } : {}),
      ...(datos.gamaComercial !== undefined ? { gamaComercial: gamaONulo(datos.gamaComercial) } : {}),
    });
  }

  async cambiarEstado(id: number, peticion: CambiarEstadoRequest): Promise<Linea> {
    const actual = this.exigir(await this.lineas.obtener(id));
    return this.aplicarCambioEstado({
      actual,
      peticion,
      contarImpacto: () => this.lineas.contarImpacto(id),
      padreActivo: () => this.lineas.padreActivo(id),
      etiquetaPadre: 'la marca',
      cambiar: (estado) => this.lineas.cambiarEstado(id, estado),
    });
  }

  async impacto(id: number): Promise<ImpactoDesactivacion> {
    this.exigir(await this.lineas.obtener(id));
    return this.lineas.contarImpacto(id);
  }
}
