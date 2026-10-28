const HEXADECIMAL = /^#([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})$/;

/** Por encima de esta luminancia (0 a 1) el color casi no se distingue del blanco de la tarjeta. */
const LUMINANCIA_MUY_CLARA = 0.85;

/** `#RRGGBB` válido; cualquier otra cosa no se pinta. */
export function esHexadecimal(valor: string): boolean {
  return HEXADECIMAL.test(valor);
}

/** Luminancia relativa (WCAG) de un `#RRGGBB`: 0 es negro y 1 es blanco. */
export function luminancia(hexadecimal: string): number {
  const partes = HEXADECIMAL.exec(hexadecimal);
  if (partes === null) return 0;
  const [r, g, b] = [partes[1], partes[2], partes[3]].map((canal) => {
    const c = Number.parseInt(canal ?? '0', 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

/** Un color tan claro que necesita borde para verse sobre fondo blanco (blancos, marfiles). */
export function esColorMuyClaro(hexadecimal: string): boolean {
  return luminancia(hexadecimal) >= LUMINANCIA_MUY_CLARA;
}
