import {
  ANCHO_MAXIMO_IMAGEN,
  DEFINICION_ESPACIOS,
  IMAGEN_MAXIMO_BYTES,
  type EspacioPublicitario,
  type ImagenSubida,
} from '../dtos/m14-patrocinios.dto';

export type VarianteImagen = 'escritorio' | 'movil';

/** Una imagen elegida en el editor, lista para enviar y para mostrar su vista previa. */
export interface ImagenElegida extends ImagenSubida {
  nombreArchivo: string;
  ancho: number;
  alto: number;
  /** `data:` URL, solo para la vista previa del editor. */
  vistaPrevia: string;
}

export const TIPOS_ACEPTADOS = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const ACEPTAR_IMAGENES = TIPOS_ACEPTADOS.join(',');

/** La proporción (ancho ÷ alto) con la que se muestra una imagen: la del espacio en escritorio y 4:3 en el celular (B5, B10). */
export function proporcionDeVista(variante: VarianteImagen, espacio: EspacioPublicitario): number {
  if (variante === 'movil') return 4 / 3;
  const { ancho, alto } = DEFINICION_ESPACIOS[espacio];
  return ancho / alto;
}

/** El texto de ayuda de cada campo de imagen: ya no hay medida obligatoria (B8), solo el tipo y el peso. */
export function ayudaDeImagen(variante: VarianteImagen): string {
  return variante === 'movil'
    ? 'JPG, PNG o WEBP de hasta 5 MB, de cualquier forma: marque abajo qué parte debe verse en el celular.'
    : 'JPG, PNG o WEBP de hasta 5 MB, de cualquier forma y tamaño: marque abajo qué parte debe verse.';
}

/** La única medida que se revisa antes de subir 5 MB: el tope de ancho de seguridad (B13). Devuelve null si la imagen sirve. */
export function problemaDeImagen(variante: VarianteImagen, ancho: number): string | null {
  const rotulo = variante === 'movil' ? 'La imagen móvil' : 'La imagen de escritorio';
  return ancho > ANCHO_MAXIMO_IMAGEN
    ? `${rotulo} mide ${ancho} px de ancho y el máximo es ${ANCHO_MAXIMO_IMAGEN} px. Redúzcala e inténtelo de nuevo.`
    : null;
}

function leerComoDataUrl(archivo: File): Promise<string> {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onload = () => (typeof lector.result === 'string' ? resolver(lector.result) : rechazar(new Error('lectura')));
    lector.onerror = () => rechazar(new Error('lectura'));
    lector.readAsDataURL(archivo);
  });
}

function medirImagen(dataUrl: string): Promise<{ ancho: number; alto: number }> {
  return new Promise((resolver, rechazar) => {
    const img = new Image();
    img.onload = () => resolver({ ancho: img.naturalWidth, alto: img.naturalHeight });
    img.onerror = () => rechazar(new Error('imagen'));
    img.src = dataUrl;
  });
}

export type ResultadoLectura = { ok: true; imagen: ImagenElegida } | { ok: false; mensaje: string };

/**
 * Lee el archivo que eligió la persona: comprueba tipo y peso, lo pasa a base64 (así viaja en el JSON, B7), mide sus
 * píxeles y comprueba el tope de ancho de seguridad.
 */
export async function leerImagen(archivo: File, variante: VarianteImagen): Promise<ResultadoLectura> {
  if (!(TIPOS_ACEPTADOS as readonly string[]).includes(archivo.type)) {
    return { ok: false, mensaje: 'Solo se aceptan imágenes JPG, PNG o WEBP (no SVG).' };
  }
  if (archivo.size > IMAGEN_MAXIMO_BYTES) {
    return { ok: false, mensaje: 'La imagen no puede pesar más de 5 MB.' };
  }
  try {
    const vistaPrevia = await leerComoDataUrl(archivo);
    const { ancho, alto } = await medirImagen(vistaPrevia);
    const problema = problemaDeImagen(variante, ancho);
    if (problema !== null) return { ok: false, mensaje: problema };
    const base64 = vistaPrevia.slice(vistaPrevia.indexOf(',') + 1);
    return {
      ok: true,
      imagen: {
        imagenBase64: base64,
        imagenMimeType: archivo.type as ImagenSubida['imagenMimeType'],
        nombreArchivo: archivo.name,
        ancho,
        alto,
        vistaPrevia,
      },
    };
  } catch {
    return { ok: false, mensaje: 'No se pudo leer la imagen: el archivo está dañado o no es una imagen válida.' };
  }
}
