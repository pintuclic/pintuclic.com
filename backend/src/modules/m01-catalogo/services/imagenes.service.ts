import {
  MAXIMO_IMAGENES_PRODUCTO,
  type ImagenProducto,
  type OrdenarImagenesRequest,
  type SubirImagenRequest,
} from '../dtos/m01-catalogo-productos.dto';
import type { ImagenBytes } from '../interfaces/catalogo.interface';
import type { ImagenesRepositoryPort } from '../interfaces/imagenes.interface';
import type { ProductosRepositoryPort } from '../interfaces/productos.interface';
import { errores, ServicioCatalogoBase } from './catalogo-base.service';
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

  async subir(idProducto: number, datos: SubirImagenRequest): Promise<ImagenProducto> {
    this.exigir(await this.productos.obtener(idProducto));
    if ((await this.imagenes.contar(idProducto)) >= MAXIMO_IMAGENES_PRODUCTO) {
      throw errores.limiteImagenes(MAXIMO_IMAGENES_PRODUCTO);
    }
    const bytes = decodificarImagenCatalogo(datos.imagenBase64, datos.imagenMimeType);
    return this.imagenes.crear(idProducto, bytes, datos.imagenMimeType);
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

  async obtenerBytes(idImagen: number): Promise<ImagenBytes> {
    return this.exigir(await this.imagenes.obtenerBytes(idImagen));
  }
}
