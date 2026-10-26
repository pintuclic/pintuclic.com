import {
  ANCHO_MAXIMO_IMAGEN,
  ANCHO_MINIMO_ESCRITORIO,
  ANCHO_MINIMO_MOVIL,
  DEFINICION_ESPACIOS,
  IMAGEN_MAXIMO_BYTES,
  PROPORCION_MOVIL,
  TAMANO_MOVIL_RECOMENDADO,
  TOLERANCIA_PROPORCION,
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

/** Lo que se pide de cada imagen: proporción, medida recomendada y ancho mínimo (B8, B13). */
export function requisitosDeImagen(variante: VarianteImagen, espacio: EspacioPublicitario) {
  if (variante === 'movil') {
    return {
      proporcion: PROPORCION_MOVIL.ancho / PROPORCION_MOVIL.alto,
      recomendado: TAMANO_MOVIL_RECOMENDADO,
      anchoMinimo: ANCHO_MINIMO_MOVIL,
      rotulo: 'La imagen móvil',
    };
  }
  const { ancho, alto } = DEFINICION_ESPACIOS[espacio];
  return { proporcion: ancho / alto, recomendado: { ancho, alto }, anchoMinimo: ANCHO_MINIMO_ESCRITORIO, rotulo: 'La imagen de escritorio' };
}

/** El texto de ayuda con la medida a subir, p. ej. «1232 × 280 px (o el doble, 2464 × 560, para pantallas nítidas)». */
export function ayudaDeMedida(variante: VarianteImagen, espacio: EspacioPublicitario): string {
  const { recomendado } = requisitosDeImagen(variante, espacio);
  const doble = `${recomendado.ancho * 2} × ${recomendado.alto * 2}`;
  return variante === 'movil'
    ? `Forma 4:3. Recomendada ${recomendado.ancho} × ${recomendado.alto} px (mínimo ${ANCHO_MINIMO_MOVIL} px de ancho).`
    : `Recomendada ${recomendado.ancho} × ${recomendado.alto} px, o el doble (${doble} px) para pantallas muy nítidas. Mínimo ${ANCHO_MINIMO_ESCRITORIO} px de ancho.`;
}

/**
 * Las mismas comprobaciones que hace el servidor (B8, B13), para avisar antes de subir 5 MB. Primero la proporción y
 * después el tamaño. Devuelve null si la imagen sirve; el servidor sigue siendo quien decide.
 */
export function problemaDeImagen(
  variante: VarianteImagen,
  espacio: EspacioPublicitario,
  ancho: number,
  alto: number,
): string | null {
  const req = requisitosDeImagen(variante, espacio);
  const recomendada = `${req.recomendado.ancho}×${req.recomendado.alto} px`;
  if (Math.abs(ancho / alto - req.proporcion) / req.proporcion > TOLERANCIA_PROPORCION) {
    return `${req.rotulo} mide ${ancho}×${alto} px y no tiene la forma del espacio. Debe medir ${recomendada} (o tener esa misma proporción, con un margen del ${Math.round(TOLERANCIA_PROPORCION * 100)} %).`;
  }
  if (ancho < req.anchoMinimo || ancho > ANCHO_MAXIMO_IMAGEN) {
    return `${req.rotulo} mide ${ancho} px de ancho: debe estar entre ${req.anchoMinimo} y ${ANCHO_MAXIMO_IMAGEN} px. Lo recomendado es ${recomendada}.`;
  }
  return null;
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
 * píxeles y le aplica las reglas de forma y tamaño del espacio.
 */
export async function leerImagen(
  archivo: File,
  variante: VarianteImagen,
  espacio: EspacioPublicitario,
): Promise<ResultadoLectura> {
  if (!(TIPOS_ACEPTADOS as readonly string[]).includes(archivo.type)) {
    return { ok: false, mensaje: 'Solo se aceptan imágenes JPG, PNG o WEBP (no SVG).' };
  }
  if (archivo.size > IMAGEN_MAXIMO_BYTES) {
    return { ok: false, mensaje: 'La imagen no puede pesar más de 5 MB.' };
  }
  try {
    const vistaPrevia = await leerComoDataUrl(archivo);
    const { ancho, alto } = await medirImagen(vistaPrevia);
    const problema = problemaDeImagen(variante, espacio, ancho, alto);
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
