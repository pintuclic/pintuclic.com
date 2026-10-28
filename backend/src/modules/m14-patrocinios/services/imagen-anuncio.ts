import sharp from 'sharp';
import {
  ANCHO_MAXIMO_IMAGEN,
  ANCHO_MEDIANO,
  ANCHO_PEQUENO,
  IMAGEN_MAXIMO_BYTES,
  type ImagenSubida,
} from '../dtos/m14-patrocinios.dto';
import type { ImagenPreparada, VarianteImagen } from '../interfaces/patrocinios.interface';
import { errores } from './patrocinios-error';

type TipoMime = ImagenSubida['imagenMimeType'];

/** Calidad de WebP de las versiones reducidas: nítida para banners y mucho más liviana que el original. */
const CALIDAD_WEBP = 82;

/** La firma real del archivo, no el nombre ni lo que diga el cliente (B7). SVG queda fuera: puede ejecutar código. */
const FIRMAS: Record<TipoMime, (b: Buffer) => boolean> = {
  'image/jpeg': (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) =>
    b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/webp': (b) =>
    b.length > 12 && b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP',
};

function decodificar(imagen: ImagenSubida, rotulo: string): Buffer {
  const limpio = imagen.imagenBase64.trim();
  if (limpio === '' || !/^[A-Za-z0-9+/]+={0,2}$/.test(limpio)) {
    throw errores.imagenInvalida(`${rotulo} no es un base64 válido.`);
  }
  const bytes = Buffer.from(limpio, 'base64');
  if (bytes.length === 0) throw errores.imagenInvalida(`${rotulo} está vacía.`);
  if (bytes.length > IMAGEN_MAXIMO_BYTES) throw errores.imagenInvalida(`${rotulo} no puede superar 5 MB.`);
  if (!FIRMAS[imagen.imagenMimeType](bytes)) {
    throw errores.imagenInvalida(`${rotulo} no es una imagen ${imagen.imagenMimeType} válida.`);
  }
  return bytes;
}

/** Ancho y alto tal como se VE la imagen (respeta la orientación EXIF de las fotos de celular). */
async function medir(bytes: Buffer, rotulo: string): Promise<{ ancho: number; alto: number }> {
  try {
    const meta = await sharp(bytes).metadata();
    if (meta.width === undefined || meta.height === undefined || meta.width < 1 || meta.height < 1) {
      throw new Error('sin dimensiones');
    }
    const girada = (meta.orientation ?? 1) >= 5;
    return girada ? { ancho: meta.height, alto: meta.width } : { ancho: meta.width, alto: meta.height };
  } catch {
    throw errores.imagenInvalida(`${rotulo} está dañada o no es una imagen válida.`);
  }
}

/** Cómo se llama la imagen en los mensajes de error. */
const ROTULO: Record<VarianteImagen, string> = { escritorio: 'La imagen de escritorio', movil: 'La imagen móvil' };

async function reducir(bytes: Buffer, ancho: number): Promise<{ bytes: Buffer; ancho: number; alto: number }> {
  const { data, info } = await sharp(bytes)
    .rotate()
    .resize({ width: ancho, withoutEnlargement: true })
    .webp({ quality: CALIDAD_WEBP })
    .toBuffer({ resolveWithObject: true });
  return { bytes: data, ancho: info.width, alto: info.height };
}

/**
 * B7, B11, B13: comprueba una imagen subida y prepara lo que se guarda (original y las dos versiones reducidas). Ya no se
 * exige una proporción ni un tamaño mínimo (B8): la imagen puede ser de cualquier forma y el espacio la recorta según su
 * punto de enfoque. Solo se rechaza lo que no es una imagen válida o pasa del tope de ancho de seguridad.
 */
export async function prepararImagen(imagen: ImagenSubida, variante: VarianteImagen): Promise<ImagenPreparada> {
  const rotulo = ROTULO[variante];
  const bytes = decodificar(imagen, rotulo);
  const { ancho, alto } = await medir(bytes, rotulo);

  if (ancho > ANCHO_MAXIMO_IMAGEN) {
    throw errores.imagenTamano(`${rotulo} mide ${ancho} px de ancho y el máximo es ${ANCHO_MAXIMO_IMAGEN} px. Redúzcala e inténtelo de nuevo.`);
  }

  try {
    const [pequeno, mediano] = await Promise.all([reducir(bytes, ANCHO_PEQUENO), reducir(bytes, ANCHO_MEDIANO)]);
    return { variante, mimeType: imagen.imagenMimeType, original: { bytes, ancho, alto }, pequeno, mediano };
  } catch {
    throw errores.imagenInvalida(`${rotulo} está dañada o no es una imagen válida.`);
  }
}
