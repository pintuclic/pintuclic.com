import {
  ANCHO_MEDIANO,
  ANCHO_PEQUENO,
  DEFINICION_ESPACIOS,
  type AnuncioPublico,
  type EspacioPublicitario,
} from '../dtos/m14-patrocinios.dto';

/** Proporción móvil 4:3 como la entiende `aspect-ratio` de CSS. */
export const ASPECTO_MOVIL = '4 / 3';

/** La proporción reservada de un espacio en escritorio y tablet (B5), p. ej. «1232 / 280». */
export function aspectoEscritorio(espacio: EspacioPublicitario): string {
  const { ancho, alto } = DEFINICION_ESPACIOS[espacio];
  return `${ancho} / ${alto}`;
}

/** La dirección de la versión reducida que se pide al servidor (B11): `pequeno` de 640 px o `mediano` de 1232 px. */
export function conTamano(url: string, tamano: 'pequeno' | 'mediano'): string {
  return `${url}${url.includes('?') ? '&' : '?'}tamano=${tamano}`;
}

/** `srcset` con las dos versiones: un celular nunca descarga el original de 5 MB (B11). */
export function srcSetDe(url: string): string {
  return `${conTamano(url, 'pequeno')} ${ANCHO_PEQUENO}w, ${conTamano(url, 'mediano')} ${ANCHO_MEDIANO}w`;
}

/**
 * B5, B10: en celulares el espacio reserva la forma 4:3 solo si algún anuncio trae imagen móvil. Los que no la traen
 * se muestran con su imagen de escritorio entera sobre un fondo suave (ver `EspacioPublicitario`), de modo que la altura
 * del espacio no cambie al rotar y la página no salte.
 */
export function hayImagenMovil(anuncios: readonly AnuncioPublico[]): boolean {
  return anuncios.some((a) => a.urlImagenMovil !== null);
}

export const indiceSiguiente = (actual: number, total: number): number => (total <= 0 ? 0 : (actual + 1) % total);
export const indiceAnterior = (actual: number, total: number): number =>
  total <= 0 ? 0 : (actual - 1 + total) % total;

/** Distancia mínima, en píxeles, para que un movimiento del dedo cuente como deslizar (B12). */
export const UMBRAL_DESLIZAR = 40;

/**
 * B12: el índice al que lleva un gesto táctil. Solo cuenta si fue sobre todo horizontal (un gesto vertical es para
 * desplazar la página) y de al menos `UMBRAL_DESLIZAR` píxeles. Deslizar hacia la izquierda avanza.
 */
export function indiceTrasDeslizar(actual: number, total: number, dx: number, dy: number): number {
  if (Math.abs(dx) < UMBRAL_DESLIZAR || Math.abs(dx) < Math.abs(dy)) return actual;
  return dx < 0 ? indiceSiguiente(actual, total) : indiceAnterior(actual, total);
}

/** B6: un enlace externo abre en una pestaña nueva con `sponsored noopener noreferrer`; uno interno, en la misma. */
export function atributosEnlace(a: Pick<AnuncioPublico, 'abrirEnNuevaPestana'>): {
  target: '_blank' | '_self';
  rel: string;
} {
  return a.abrirEnNuevaPestana
    ? { target: '_blank', rel: 'sponsored noopener noreferrer' }
    : { target: '_self', rel: 'sponsored' };
}
