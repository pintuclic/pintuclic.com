/** Luminancia relativa WCAG de un color `#RRGGBB`. */
export function luminanciaRelativa(hex: string): number {
  const canal = (desde: number): number => {
    const c = parseInt(hex.slice(desde, desde + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5);
}

export function razonDeContraste(a: string, b: string): number {
  const [claro, oscuro] = [luminanciaRelativa(a), luminanciaRelativa(b)].sort((x, y) => y - x) as [number, number];
  return (claro + 0.05) / (oscuro + 0.05);
}

/** P15: el texto que se lee mejor sobre `fondo`: negro o blanco, el de más contraste (siempre ≥ 4,5:1 sobre cualquier color). */
export function colorDeTexto(fondo: string): '#000000' | '#FFFFFF' {
  return razonDeContraste(fondo, '#000000') >= razonDeContraste(fondo, '#FFFFFF') ? '#000000' : '#FFFFFF';
}

/** «muy parecido», «parecido» o «aproximado» según el ΔE (P8). */
export function parecidoEnPalabras(deltaE: number, muyParecido: number, parecido: number): string {
  if (deltaE <= muyParecido) return 'muy parecido';
  if (deltaE <= parecido) return 'parecido';
  return 'aproximado';
}
