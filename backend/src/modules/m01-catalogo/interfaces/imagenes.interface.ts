import type { ImagenProducto } from '../dtos/m01-catalogo-productos.dto';
import type { ImagenBytes } from './catalogo.interface';

export interface MetaImagen {
  idImagen: number;
  idProducto: number;
  esPrincipal: boolean;
}

/** Imágenes de un producto (galería). Los bytes solo se leen en `obtenerBytes`. */
export interface ImagenesRepositoryPort {
  listar(idProducto: number): Promise<ImagenProducto[]>;
  contar(idProducto: number): Promise<number>;
  /** La primera imagen de un producto queda como principal (I2). */
  crear(idProducto: number, bytes: Buffer, mimeType: ImagenBytes['mimeType']): Promise<ImagenProducto>;
  obtenerMeta(idImagen: number): Promise<MetaImagen | null>;
  obtenerBytes(idImagen: number): Promise<ImagenBytes | null>;
  /** Reasigna el orden según la lista (ya validada por el servicio). */
  ordenar(idProducto: number, idsOrdenados: readonly number[]): Promise<ImagenProducto[]>;
  marcarPrincipal(idImagen: number): Promise<ImagenProducto>;
  /** Si era la principal, la siguiente en el orden pasa a serlo (I2). */
  eliminar(idImagen: number): Promise<void>;
}
