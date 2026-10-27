import {
  DESPLAZAMIENTOS_SIN_TONO,
  LUMINOSIDAD_MAXIMA,
  LUMINOSIDAD_MINIMA,
  SATURACION_SIN_TONO,
  DEFINICION_ARMONIAS,
  type TipoArmonia,
} from '../dtos/m01-catalogo-paleta.dto';

/** Un color en HSL: tono 0 a 360 (exclusivo), saturación y luminosidad de 0 a 100. */
export interface Hsl {
  h: number;
  s: number;
  l: number;
}
export interface Lab {
  l: number;
  a: number;
  b: number;
}

const canal = (hex: string, desde: number): number => parseInt(hex.slice(desde, desde + 2), 16);

export function hexARgb(hex: string): [number, number, number] {
  return [canal(hex, 1), canal(hex, 3), canal(hex, 5)];
}

export function rgbAHex(r: number, g: number, b: number): string {
  const dos = (n: number): string => Math.min(255, Math.max(0, Math.round(n))).toString(16).padStart(2, '0');
  return `#${dos(r)}${dos(g)}${dos(b)}`.toUpperCase();
}

export function hexAHsl(hex: string): Hsl {
  const [r, g, b] = hexARgb(hex).map((v) => v / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l: l * 100 };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s: s * 100, l: l * 100 };
}

export function hslAHex({ h, s, l }: Hsl): string {
  const S = s / 100;
  const L = l / 100;
  const c = (1 - Math.abs(2 * L - 1)) * S;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r1, g1, b1] =
    hp < 1 ? [c, x, 0] : hp < 2 ? [x, c, 0] : hp < 3 ? [0, c, x] : hp < 4 ? [0, x, c] : hp < 5 ? [x, 0, c] : [c, 0, x];
  const m = L - c / 2;
  return rgbAHex((r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255);
}

const linealizar = (v: number): number => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const BLANCO_D65 = { x: 0.95047, y: 1, z: 1.08883 };
const f = (t: number): number => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);

/** sRGB → CIELAB con blanco D65 (P8). */
export function hexALab(hex: string): Lab {
  const [r, g, b] = hexARgb(hex).map(linealizar) as [number, number, number];
  const x = 0.4124564 * r + 0.3575761 * g + 0.1804375 * b;
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const z = 0.0193339 * r + 0.119192 * g + 0.9503041 * b;
  const fx = f(x / BLANCO_D65.x);
  const fy = f(y / BLANCO_D65.y);
  const fz = f(z / BLANCO_D65.z);
  return { l: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

/** ΔE CIE76: distancia euclidiana en CIELAB. */
export function deltaE76(p: Lab, q: Lab): number {
  return Math.hypot(p.l - q.l, p.a - q.a, p.b - q.b);
}

const acotar = (l: number): number => Math.min(LUMINOSIDAD_MAXIMA, Math.max(LUMINOSIDAD_MINIMA, l));

/** P7: los colores que arman con `hex` para cada tipo de armonía, tal cual salen de la regla (sin buscarles pareja). */
export function muestrasDeArmonia(hex: string, tipo: TipoArmonia): { hexadecimal: string }[] {
  const base = hexAHsl(hex);
  const sinTono = base.s < SATURACION_SIN_TONO;
  const def = DEFINICION_ARMONIAS[tipo];
  let colores: Hsl[];
  if (tipo === 'monocromatico') {
    colores = (def.luminosidades ?? []).map((l) => ({ h: base.h, s: base.s, l }));
  } else if (sinTono) {
    const luminosidades =
      tipo === 'complementario' ? [100 - base.l] : DESPLAZAMIENTOS_SIN_TONO[tipo].map((d) => base.l + d);
    colores = luminosidades.map((l) => ({ h: base.h, s: base.s, l: acotar(l) }));
  } else {
    colores = def.desplazamientos.map((d) => ({ h: base.h + d, s: base.s, l: base.l }));
  }
  return colores.map((c) => ({ hexadecimal: hslAHex(c) }));
}

export const esSinTono = (hex: string): boolean => hexAHsl(hex).s < SATURACION_SIN_TONO;
