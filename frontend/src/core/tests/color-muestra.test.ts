import { describe, expect, it } from 'vitest';
import { colorDeTexto, esColorMuyClaro, esHexadecimal, luminancia, razonDeContraste } from '../utils/color-muestra';

describe('luminancia y contraste de una muestra de color', () => {
  it('la luminancia va de 0 (negro) a 1 (blanco)', () => {
    expect(luminancia('#000000')).toBe(0);
    expect(luminancia('#FFFFFF')).toBeCloseTo(1, 5);
  });

  it('el contraste del negro sobre el blanco es 21, y el de un color consigo mismo es 1', () => {
    expect(razonDeContraste('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(razonDeContraste('#F7C600', '#F7C600')).toBeCloseTo(1, 5);
  });

  it('el contraste no depende del orden de los colores', () => {
    expect(razonDeContraste('#1F2F55', '#F7C600')).toBeCloseTo(razonDeContraste('#F7C600', '#1F2F55'), 10);
  });

  it('negro sobre claros y blanco sobre oscuros', () => {
    expect(colorDeTexto('#F7F5EF')).toBe('#000000');
    expect(colorDeTexto('#FFC785')).toBe('#000000');
    expect(colorDeTexto('#1E1E1E')).toBe('#FFFFFF');
    expect(colorDeTexto('#1F2F55')).toBe('#FFFFFF');
  });

  it('el texto elegido se lee (≥ 4,5:1) sobre cualquier color de una rejilla amplia', () => {
    // 17 × 17 × 17 = 4 913 colores repartidos por todo el cubo RGB, extremos incluidos.
    const pasos = Array.from({ length: 17 }, (_, i) => Math.min(255, i * 16));
    const hex = (n: number): string => n.toString(16).padStart(2, '0').toUpperCase();
    let peor = Infinity;
    for (const r of pasos) {
      for (const g of pasos) {
        for (const b of pasos) {
          const fondo = `#${hex(r)}${hex(g)}${hex(b)}`;
          peor = Math.min(peor, razonDeContraste(fondo, colorDeTexto(fondo)));
        }
      }
    }
    expect(peor).toBeGreaterThanOrEqual(4.5);
  });

  it('un valor que no es #RRGGBB no rompe nada y se trata como oscuro', () => {
    expect(esHexadecimal('azul')).toBe(false);
    expect(colorDeTexto('azul')).toBe('#FFFFFF');
    expect(esColorMuyClaro('azul')).toBe(false);
  });
});
