import type {
  CambiarAsociacionImagenRequest,
  SubirImagenAsociadaRequest,
  TamanoImagen,
} from '../dtos/m01-catalogo-entrega3.dto';
import {
  MAXIMO_IMAGENES_PRODUCTO,
  type ImagenProducto,
  type OrdenarImagenesRequest,
} from '../dtos/m01-catalogo-productos.dto';
import type { ImagenBytes } from '../interfaces/catalogo.interface';
import type { AsociacionImagen, ImagenesRepositoryPort } from '../interfaces/imagenes.interface';
import type { ProductosRepositoryPort } from '../interfaces/productos.interface';
import { errores, ServicioCatalogoBase } from './catalogo-base.service';
import { generarDerivadas, servirImagen } from './imagen-derivadas';
import { decodificarImagenCatalogo } from './logotipo';

/** HU-CAT-07: galería de imágenes de un producto (I1 a I5). */
export class ImagenesService extends ServicioCatalogoBase {
  constructor(
    private readonly imagenes: ImagenesRepositoryPort,
    private readonly productos: ProductosRepositoryPort,
  ) {
    super();
  }

  async listar(idProducto: number): Promise<ImagenProducto[]> {
    this.exigir(await this.productos.obtener(idProducto));
    return this.imagenes.listar(idProducto);
  }

  async subir(idProducto: number, datos: SubirImagenAsociadaRequest): Promise<ImagenProducto> {
    this.exigir(await this.productos.obtener(idProducto));
    if ((await this.imagenes.contar(idProducto)) >= MAXIMO_IMAGENES_PRODUCTO) {
      throw errores.limiteImagenes(MAXIMO_IMAGENES_PRODUCTO);
    }
    const asociacion: AsociacionImagen = { idVariante: datos.idVariante ?? null, idColor: datos.idColor ?? null };
    await this.exigirAsociacion(idProducto, asociacion);
    const bytes = decodificarImagenCatalogo(datos.imagenBase64, datos.imagenMimeType);
    // I7: miniatura y versión mediana se generan una sola vez, al subir.
    return this.imagenes.crear(idProducto, bytes, datos.imagenMimeType, asociacion, await generarDerivadas(bytes));
  }

  /** I5: la imagen puede dejar de ser general o cambiar de variante o color. */
  async cambiarAsociacion(idImagen: number, datos: CambiarAsociacionImagenRequest): Promise<ImagenProducto> {
    const meta = this.exigir(await this.imagenes.obtenerMeta(idImagen));
    await this.exigirAsociacion(meta.idProducto, datos);
    return this.imagenes.cambiarAsociacion(idImagen, datos);
  }

  /** I5: la variante debe ser del producto y el color debe estar en su carta o entre sus colores de fábrica. */
  private async exigirAsociacion(idProducto: number, asociacion: AsociacionImagen): Promise<void> {
    if (asociacion.idVariante !== null) {
      const producto = this.exigir(await this.productos.obtener(idProducto));
      if (!producto.variantes.some((v) => v.idVariante === asociacion.idVariante)) {
        throw errores.relacionInvalida('La variante no es de este producto.', 'idVariante');
      }
    }
    if (asociacion.idColor !== null && !(await this.productos.colorOfrecido(idProducto, asociacion.idColor))) {
      throw errores.relacionInvalida('El color no es uno de los que ofrece este producto.', 'idColor');
    }
  }

  /** I3: la lista debe contener exactamente las imágenes del producto. */
  async ordenar(idProducto: number, datos: OrdenarImagenesRequest): Promise<ImagenProducto[]> {
    this.exigir(await this.productos.obtener(idProducto));
    const actuales = (await this.imagenes.listar(idProducto)).map((i) => i.idImagen).sort((a, b) => a - b);
    const enviadas = [...datos.idsOrdenados].sort((a, b) => a - b);
    if (actuales.length !== enviadas.length || actuales.some((id, i) => id !== enviadas[i])) {
      throw errores.relacionInvalida(
        'Envíe todas las imágenes del producto, sin repetir ni agregar otras.',
        'idsOrdenados',
      );
    }
    return this.imagenes.ordenar(idProducto, datos.idsOrdenados);
  }

  async marcarPrincipal(idImagen: number): Promise<ImagenProducto> {
    this.exigir(await this.imagenes.obtenerMeta(idImagen));
    return this.imagenes.marcarPrincipal(idImagen);
  }

  /** I5: no se elimina la única imagen de un producto publicado. */
  async eliminar(idImagen: number): Promise<void> {
    const meta = this.exigir(await this.imagenes.obtenerMeta(idImagen));
    const producto = this.exigir(await this.productos.obtener(meta.idProducto));
    if (producto.publicado && (await this.imagenes.contar(meta.idProducto)) <= 1) {
      throw errores.noPublicable(
        'No se puede eliminar la única imagen de un producto publicado: despublíquelo primero.',
      );
    }
    await this.imagenes.eliminar(idImagen);
  }

  /** I7: `tamano` elige el original o una de las versiones reducidas. */
  async obtenerBytes(idImagen: number, tamano: TamanoImagen = 'original'): Promise<ImagenBytes> {
    return this.exigir(
      await servirImagen(tamano, {
        original: () => this.imagenes.obtenerBytes(idImagen),
        derivada: (t) => this.imagenes.obtenerDerivada(idImagen, t),
        guardar: (t, bytes) => this.imagenes.guardarDerivada(idImagen, t, bytes),
      }),
    );
  }
}
