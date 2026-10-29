import { describe, expect, it } from 'vitest';
import { MARGEN_ARRIBA_PX, franjaVisible } from '../utils/encabezado';

describe('franja superior de la cabecera fija', () => {
  it('arriba de todo se ve', () => {
    expect(franjaVisible(0)).toBe(true);
    expect(franjaVisible(MARGEN_ARRIBA_PX)).toBe(true);
    // El rebote al tope en iOS puede dar scroll negativo.
    expect(franjaVisible(-20)).toBe(true);
  });

  it('apenas se baja de ese margen se pliega', () => {
    expect(franjaVisible(MARGEN_ARRIBA_PX + 1)).toBe(false);
    expect(franjaVisible(36)).toBe(false);
    expect(franjaVisible(4000)).toBe(false);
  });
});
