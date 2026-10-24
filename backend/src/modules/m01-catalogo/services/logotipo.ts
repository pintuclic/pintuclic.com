import { LOGOTIPO_MAXIMO_BYTES, TIPOS_MIME_LOGOTIPO } from '../dtos/m01-catalogo.dto';
import { CatalogoError, errores } from './catalogo-base.service';

type TipoMime = (typeof TIPOS_MIME_LOGOTIPO)[number];

const FIRMAS: Record<TipoMime, (b: Buffer) => boolean> = {
  'image/jpeg': (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) =>
    b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/webp': (b) =>
    b.length > 12 && b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP',
};

/**
 * Decodifica una imagen recibida en base64 y comprueba que sea del tipo declarado (por su
 * firma de archivo, no por el nombre) y que no pase de 5 MB. `rotulo` y `error` adaptan el
 * mensaje y el código a lo que se sube (logotipo de marca, imagen de producto o de medida).
 */
export function decodificarImagen(
  base64: string,
  mimeType: TipoMime,
  rotulo: string,
  error: (mensaje: string) => CatalogoError,
): Buffer {
  const limpio = base64.trim();
  if (limpio === '' || !/^[A-Za-z0-9+/]+={0,2}$/.test(limpio)) {
    throw error(`${rotulo} no es un base64 válido.`);
  }
  const bytes = Buffer.from(limpio, 'base64');
  if (bytes.length === 0) {
    throw error(`${rotulo} está vacío.`);
  }
  if (bytes.length > LOGOTIPO_MAXIMO_BYTES) {
    throw error(`${rotulo} no puede superar 5 MB.`);
  }
  if (!FIRMAS[mimeType](bytes)) {
    throw error(`El archivo no es una imagen ${mimeType} válida.`);
  }
  return bytes;
}

/** R9: el logotipo de una marca. */
export function decodificarLogotipo(base64: string, mimeType: TipoMime): Buffer {
  return decodificarImagen(base64, mimeType, 'El logotipo', errores.logotipoInvalido);
}

/** I1: una imagen de producto o de medida. */
export function decodificarImagenCatalogo(base64: string, mimeType: TipoMime): Buffer {
  return decodificarImagen(base64, mimeType, 'La imagen', errores.imagenInvalida);
}
