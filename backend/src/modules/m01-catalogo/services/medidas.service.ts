import type {
  CambiarEstadoRequest,
  CrearMedidaRequest,
  EditarMedidaRequest,
  ImpactoDesactivacion,
  ListarMedidasRequest,
  Medida,
} from '../dtos/m01-catalogo.dto';
import type { SubirImagenRequest } from '../dtos/m01-catalogo-productos.dto';
import type {
  ImagenBytes,
  MedidasRepositoryPort,
  Pagina,
  TiposMedidaRepositoryPort,
} from '../interfaces/catalogo.interface';
import { errores, ServicioCatalogoBase } from './catalogo-base.service';
import { decodificarImagenCatalogo } from './logotipo';

/** R12: nombre generado con la abreviatura: "1 gal", "0.25 gal", "2 in". */
export function nombreDeMedida(valor: number, abreviatura: string): string {
  return `${valor} ${abreviatura}`;
}

/** HU-CAT-03 (parte de medidas): valor + tipo de medida, reutilizable entre productos. */
export class MedidasService extends ServicioCatalogoBase {
  constructor(
    private readonly medidas: MedidasRepositoryPort,
    private readonly tipos: TiposMedidaRepositoryPort,
  ) {
    super();
  }

  listar(query: ListarMedidasRequest): Promise<Pagina<Medida>> {
    return this.medidas.listar(query);
  }

  /** R8: no se crea una medida bajo un tipo de medida inactivo. */
  async crear(datos: CrearMedidaRequest): Promise<Medida> {
    const tipo = this.exigir(await this.tipos.obtener(datos.idTipoMedida));
    if (tipo.estado !== 'activo') {
      throw errores.padreInactivo('el tipo de medida');
    }
    const nombre = datos.nombre ?? nombreDeMedida(datos.valor, tipo.abreviatura);
    await this.exigirNombreLibre(
      this.medidas.existeDuplicado({ idTipoMedida: datos.idTipoMedida, valor: datos.valor, nombre }),
      'una medida con ese valor, tipo o nombre',
    );
    return this.medidas.crear({ idTipoMedida: datos.idTipoMedida, valor: datos.valor, nombre });
  }

  /**
   * Si cambia el valor y no se envía nombre, el nombre se regenera cuando era el generado
   * (así "1 gal" pasa a "2 gal"); un nombre escrito a mano se respeta.
   */
  async editar(id: number, datos: EditarMedidaRequest): Promise<Medida> {
    const actual = this.exigir(await this.medidas.obtener(id));
    const tipoActual = this.exigir(await this.tipos.obtener(actual.idTipoMedida));
    const idTipoMedida = datos.idTipoMedida ?? actual.idTipoMedida;
    let tipo = tipoActual;
    if (idTipoMedida !== actual.idTipoMedida) {
      tipo = this.exigir(await this.tipos.obtener(idTipoMedida));
      if (tipo.estado !== 'activo') {
        throw errores.padreInactivo('el tipo de medida');
      }
    }
    const valor = datos.valor ?? actual.valor;
    const cambioElNombreGenerado = datos.valor !== undefined || idTipoMedida !== actual.idTipoMedida;
    const eraGenerado = actual.nombre === nombreDeMedida(actual.valor, tipoActual.abreviatura);
    const nombre =
      datos.nombre ?? (cambioElNombreGenerado && eraGenerado ? nombreDeMedida(valor, tipo.abreviatura) : actual.nombre);
    await this.exigirNombreLibre(
      this.medidas.existeDuplicado({ idTipoMedida, valor, nombre }, id),
      'una medida con ese valor, tipo o nombre',
    );
    return this.medidas.editar(id, { idTipoMedida, valor, nombre });
  }

  /** I4: la imagen de una medida (por ejemplo la silueta del envase). */
  async reemplazarImagen(id: number, datos: SubirImagenRequest): Promise<Medida> {
    this.exigir(await this.medidas.obtener(id));
    const imagen = decodificarImagenCatalogo(datos.imagenBase64, datos.imagenMimeType);
    return this.medidas.reemplazarImagen(id, imagen, datos.imagenMimeType);
  }

  async quitarImagen(id: number): Promise<Medida> {
    this.exigir(await this.medidas.obtener(id));
    return this.medidas.quitarImagen(id);
  }

  async obtenerImagen(id: number): Promise<ImagenBytes> {
    return this.exigir(await this.medidas.obtenerImagen(id));
  }

  async cambiarEstado(id: number, peticion: CambiarEstadoRequest): Promise<Medida> {
    const actual = this.exigir(await this.medidas.obtener(id));
    return this.aplicarCambioEstado({
      actual,
      peticion,
      contarImpacto: () => this.medidas.contarImpacto(id),
      padreActivo: () => this.medidas.padreActivo(id),
      etiquetaPadre: 'el tipo de medida',
      cambiar: (estado) => this.medidas.cambiarEstado(id, estado),
    });
  }

  async impacto(id: number): Promise<ImpactoDesactivacion> {
    this.exigir(await this.medidas.obtener(id));
    return this.medidas.contarImpacto(id);
  }
}
