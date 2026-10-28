import type { ImagenProducto } from '../dtos/m01-catalogo-productos.dto';
import type { ImagenBytes } from './catalogo.interface';

/** Entrega 3 (I5): a lo sumo una de las dos; las dos en null = imagen general del producto. */
export interface AsociacionImagen {
  idVariante: number | null;
  idColor: number | null;
}

export type TamanoDerivado = 'miniatura' | 'mediana';

/** Miniatura y versión mediana, en WebP (I7), generadas al subir la imagen. */
export interface Derivadas {
  miniatura: Buffer;
  mediana: Buffer;
}

/**
 * Lo que hay guardado de una imagen en un tamaño derivado. Si `derivada` es null (imágenes anteriores
 * a la entrega 3) viene el original para generarla al vuelo y guardarla.
 */
export interface DerivadaGuardada {
  derivada: Buffer | null;
  original: ImagenBytes | null;
}

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
  crear(
    idProducto: number,
    bytes: Buffer,
    mimeType: ImagenBytes['mimeType'],
    asociacion: AsociacionImagen,
    derivadas: Derivadas,
  ): Promise<ImagenProducto>;
  cambiarAsociacion(idImagen: number, asociacion: AsociacionImagen): Promise<ImagenProducto>;
  obtenerDerivada(idImagen: number, tamano: TamanoDerivado): Promise<DerivadaGuardada | null>;
  guardarDerivada(idImagen: number, tamano: TamanoDerivado, bytes: Buffer): Promise<void>;
  obtenerMeta(idImagen: number): Promise<MetaImagen | null>;
  obtenerBytes(idImagen: number): Promise<ImagenBytes | null>;
  /** Reasigna el orden según la lista (ya validada por el servicio). */
  ordenar(idProducto: number, idsOrdenados: readonly number[]): Promise<ImagenProducto[]>;
  marcarPrincipal(idImagen: number): Promise<ImagenProducto>;
  /** Si era la principal, la siguiente en el orden pasa a serlo (I2). */
  eliminar(idImagen: number): Promise<void>;
}
