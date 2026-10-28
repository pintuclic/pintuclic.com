import { describe, expect, it } from 'vitest';
import { UMBRAL_SCROLL_PX, franjaVisible } from '../utils/encabezado';

const ALTO = 36;

describe('franja superior de la cabecera fija', () => {
  it('arriba de todo siempre se ve', () => {
    expect(franjaVisible(false, 0, 500, ALTO)).toBe(true);
    expect(franjaVisible(false, ALTO, 500, ALTO)).toBe(true);
    expect(franjaVisible(true, 10, 0, ALTO)).toBe(true);
  });

  it('se esconde al bajar y reaparece al subir', () => {
    expect(franjaVisible(true, 300, 200, ALTO)).toBe(false);
    expect(franjaVisible(false, 250, 300, ALTO)).toBe(true);
  });

  it('un temblor pequeño no la cambia, en ningún sentido', () => {
    expect(franjaVisible(true, 300 + UMBRAL_SCROLL_PX, 300, ALTO)).toBe(true);
    expect(franjaVisible(false, 300 - UMBRAL_SCROLL_PX, 300, ALTO)).toBe(false);
    expect(franjaVisible(false, 300, 300, ALTO)).toBe(false);
  });

  it('un cambio apenas mayor al umbral sí cuenta', () => {
    expect(franjaVisible(true, 300 + UMBRAL_SCROLL_PX + 1, 300, ALTO)).toBe(false);
    expect(franjaVisible(false, 300 - UMBRAL_SCROLL_PX - 1, 300, ALTO)).toBe(true);
  });

  it('un salto grande hacia arriba (volver al inicio) la muestra', () => {
    expect(franjaVisible(false, 0, 4000, ALTO)).toBe(true);
  });
});
