import { describe, expect, it } from 'vitest';
import { textoRendimiento } from '../services/rendimiento';

describe('M01 · texto del rendimiento', () => {
  it('lo marca como aproximado y agrega las manos si las hay', () => {
    const r = { min: 5, max: 7.5, aproximado: true as const };
    expect(textoRendimiento(r, null)).toBe('Rinde aprox. 5 a 7,5 m²');
    expect(textoRendimiento(r, 2)).toBe('Rinde aprox. 5 a 7,5 m² a 2 manos');
    expect(textoRendimiento(r, 1)).toBe('Rinde aprox. 5 a 7,5 m² a 1 mano');
  });

  it('sin rendimiento no hay texto', () => {
    expect(textoRendimiento(null, 2)).toBeNull();
  });
});
