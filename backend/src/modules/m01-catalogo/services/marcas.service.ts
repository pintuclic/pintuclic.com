import type {
  CambiarEstadoRequest,
  CrearMarcaRequest,
  EditarMarcaRequest,
  ImpactoDesactivacion,
  ListarBaseRequest,
  Marca,
  ReemplazarLogotipoRequest,
} from '../dtos/m01-catalogo.dto';
import type { LogotipoMarca, MarcasRepositoryPort, Pagina } from '../interfaces/catalogo.interface';
import { ServicioCatalogoBase } from './catalogo-base.service';
import { decodificarLogotipo } from './logotipo';

/** HU-CAT-04: marcas con logotipo obligatorio. */
export class MarcasService extends ServicioCatalogoBase {
  constructor(private readonly marcas: MarcasRepositoryPort) {
    super();
  }

  listar(query: ListarBaseRequest): Promise<Pagina<Marca>> {
    return this.marcas.listar(query);
  }

  async obtener(id: number): Promise<Marca> {
    return this.exigir(await this.marcas.obtener(id));
  }

  async crear(datos: CrearMarcaRequest): Promise<Marca> {
    const logotipo = decodificarLogotipo(datos.logotipoBase64, datos.logotipoMimeType);
    await this.exigirNombreLibre(this.marcas.existeDuplicado({ nombre: datos.nombre }), 'una marca');
    return this.marcas.crear({ nombre: datos.nombre, logotipo, logotipoMimeType: datos.logotipoMimeType });
  }

  async editar(id: number, datos: EditarMarcaRequest): Promise<Marca> {
    this.exigir(await this.marcas.obtener(id));
    await this.exigirNombreLibre(this.marcas.existeDuplicado({ nombre: datos.nombre }, id), 'una marca');
    return this.marcas.editar(id, datos);
  }

  async reemplazarLogotipo(id: number, datos: ReemplazarLogotipoRequest): Promise<Marca> {
    this.exigir(await this.marcas.obtener(id));
    const logotipo = decodificarLogotipo(datos.logotipoBase64, datos.logotipoMimeType);
    return this.marcas.reemplazarLogotipo(id, logotipo, datos.logotipoMimeType);
  }

  async obtenerLogotipo(id: number): Promise<LogotipoMarca> {
    return this.exigir(await this.marcas.obtenerLogotipo(id));
  }

  async cambiarEstado(id: number, peticion: CambiarEstadoRequest): Promise<Marca> {
    const actual = this.exigir(await this.marcas.obtener(id));
    return this.aplicarCambioEstado({
      actual,
      peticion,
      contarImpacto: () => this.marcas.contarImpacto(id),
      padreActivo: () => this.marcas.padreActivo(id),
      etiquetaPadre: 'el padre',
      cambiar: (estado) => this.marcas.cambiarEstado(id, estado),
    });
  }

  async impacto(id: number): Promise<ImpactoDesactivacion> {
    this.exigir(await this.marcas.obtener(id));
    return this.marcas.contarImpacto(id);
  }
}
