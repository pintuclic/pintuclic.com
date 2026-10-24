/**
 * D8 del contrato: cuando un color no declara familia, el servidor la deriva de su
 * hexadecimal eligiendo la familia cuya muestra (su propio hexadecimal) es la más cercana
 * en el espacio CIELAB. Usa las muestras de las familias vigentes, así que no depende de
 * cómo se llamen ni de cuántas haya. El administrador puede corregir el resultado.
 */

interface Lab {
  l: number;
  a: number;
  b: number;
}

function canalLineal(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function f(t: number): number {
  return t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116;
}

/** sRGB (D65) → CIELAB. Entrada `#RRGGBB`. */
export function hexALab(hexadecimal: string): Lab {
  const n = parseInt(hexadecimal.slice(1), 16);
  const r = canalLineal((n >> 16) & 255);
  const g = canalLineal((n >> 8) & 255);
  const b = canalLineal(n & 255);
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;
  return { l: 116 * f(y) - 16, a: 500 * (f(x) - f(y)), b: 200 * (f(y) - f(z)) };
}

/** Diferencia de color ΔE (CIE76). */
export function distanciaColor(a: string, b: string): number {
  const x = hexALab(a);
  const y = hexALab(b);
  return Math.hypot(x.l - y.l, x.a - y.a, x.b - y.b);
}

export interface MuestraFamilia {
  idFamiliaColor: number;
  hexadecimal: string;
}

/** Luminosidad, croma y tono (grados) de un color: el espacio CIELCh. */
interface Lch {
  l: number;
  c: number;
  h: number;
}

function hexALch(hexadecimal: string): Lch {
  const { l, a, b } = hexALab(hexadecimal);
  const grados = (Math.atan2(b, a) * 180) / Math.PI;
  return { l, c: Math.hypot(a, b), h: grados < 0 ? grados + 360 : grados };
}

/** Diferencia entre dos tonos, en grados (0–180). */
function diferenciaDeTono(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** Por debajo de este croma un color no tiene tono: es blanco, gris o negro. */
const CROMA_SIN_TONO = 10;
/** Un blanco con un leve tinte (crema) sigue siendo "sin tono" si es muy claro. */
const LUMINOSIDAD_BLANCO = 88;
const CROMA_MAXIMO_BLANCO = 16;

function sinTono(lch: Lch, esMuestra: boolean): boolean {
  if (lch.c < CROMA_SIN_TONO) return true;
  return !esMuestra && lch.l > LUMINOSIDAD_BLANCO && lch.c < CROMA_MAXIMO_BLANCO;
}

/**
 * Devuelve el id de la familia que mejor describe el color, o null si no hay familias.
 *  1. Un color sin tono (blanco, gris, negro) va a la familia sin tono de luminosidad más cercana.
 *  2. El resto va a la familia de tono más parecido; se desempata por croma y luminosidad.
 */
export function derivarFamilia(hexadecimal: string, familias: readonly MuestraFamilia[]): number | null {
  if (familias.length === 0) return null;
  const color = hexALch(hexadecimal);
  const muestras = familias.map((f) => ({ id: f.idFamiliaColor, hex: f.hexadecimal, lch: hexALch(f.hexadecimal) }));

  const sinTonoFamilias = muestras.filter((m) => sinTono(m.lch, true));
  const conTonoFamilias = muestras.filter((m) => !sinTono(m.lch, true));

  const elegir = (candidatas: typeof muestras, puntaje: (m: (typeof muestras)[number]) => number): number | null => {
    let mejor: number | null = null;
    let menor = Number.POSITIVE_INFINITY;
    for (const m of candidatas) {
      const p = puntaje(m);
      if (p < menor) {
        menor = p;
        mejor = m.id;
      }
    }
    return mejor;
  };

  if (sinTono(color, false) && sinTonoFamilias.length > 0) {
    return elegir(sinTonoFamilias, (m) => Math.abs(m.lch.l - color.l));
  }
  if (conTonoFamilias.length > 0) {
    return elegir(
      conTonoFamilias,
      (m) => diferenciaDeTono(color.h, m.lch.h) + 0.5 * Math.abs(color.c - m.lch.c) + 0.3 * Math.abs(color.l - m.lch.l),
    );
  }
  return elegir(muestras, (m) => distanciaColor(hexadecimal, m.hex));
}
