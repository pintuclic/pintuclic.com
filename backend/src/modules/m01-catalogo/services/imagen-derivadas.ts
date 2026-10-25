import sharp from 'sharp';
import { TAMANO_MEDIANA_PX, TAMANO_MINIATURA_PX } from '../dtos/m01-catalogo-entrega3.dto';
import type { ImagenBytes } from '../interfaces/catalogo.interface';
import type { DerivadaGuardada, Derivadas, TamanoDerivado } from '../interfaces/imagenes.interface';
import { errores } from './catalogo-base.service';

/** Lado mayor, en píxeles, de cada tamaño derivado (I7). */
const LADO_MAYOR: Record<TamanoDerivado, number> = {
  miniatura: TAMANO_MINIATURA_PX,
  mediana: TAMANO_MEDIANA_PX,
};

/** Calidad de WebP: buena para fotos de producto y mucho más liviana que el original. */
const CALIDAD_WEBP = 80;

export const MIME_DERIVADA: ImagenBytes['mimeType'] = 'image/webp';

/**
 * I7: versión reducida en WebP. Respeta la orientación EXIF y nunca agranda una imagen que ya es
 * más pequeña que el tamaño pedido.
 */
export async function generarDerivada(original: Buffer, tamano: TamanoDerivado): Promise<Buffer> {
  try {
    return await sharp(original)
      .rotate()
      .resize({ width: LADO_MAYOR[tamano], height: LADO_MAYOR[tamano], fit: 'inside', withoutEnlargement: true })
      .webp({ quality: CALIDAD_WEBP })
      .toBuffer();
  } catch {
    throw errores.imagenInvalida('No se pudo procesar la imagen: el archivo está dañado o no es una imagen válida.');
  }
}

export async function generarDerivadas(original: Buffer): Promise<Derivadas> {
  const [miniatura, mediana] = await Promise.all([
    generarDerivada(original, 'miniatura'),
    generarDerivada(original, 'mediana'),
  ]);
  return { miniatura, mediana };
}

export interface FuentesDeImagen {
  original: () => Promise<ImagenBytes | null>;
  derivada: (tamano: TamanoDerivado) => Promise<DerivadaGuardada | null>;
  guardar: (tamano: TamanoDerivado, bytes: Buffer) => Promise<void>;
}

/**
 * Entrega la imagen en el tamaño pedido. Las imágenes subidas antes de la entrega 3 no tienen
 * derivadas: se generan la primera vez que alguien las pide y se guardan (D7).
 * null = la imagen no existe o no es visible para quien la pide.
 */
export async function servirImagen(
  tamano: TamanoDerivado | 'original',
  fuentes: FuentesDeImagen,
): Promise<ImagenBytes | null> {
  if (tamano === 'original') return fuentes.original();
  const guardada = await fuentes.derivada(tamano);
  if (guardada === null) return null;
  if (guardada.derivada !== null) return { bytes: guardada.derivada, mimeType: MIME_DERIVADA };
  if (guardada.original === null) return null;
  const generada = await generarDerivada(guardada.original.bytes, tamano);
  await fuentes.guardar(tamano, generada);
  return { bytes: generada, mimeType: MIME_DERIVADA };
}
