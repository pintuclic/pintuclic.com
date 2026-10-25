import { describe, expect, it } from 'vitest';
import {
  aAsociacion,
  etiquetaDeAsociacion,
  opcionesAsociacion,
  valorDeAsociacion,
} from '../services/asociacion-imagen';

const destinos = {
  variantes: [
    { idVariante: 4, medida: '1 galón' },
    { idVariante: 5, medida: '1/4 de galón' },
  ],
  colores: [{ id: 9, nombre: 'Rojo colonial' }],
};

describe('M01 · asociación de imágenes (I5)', () => {
  it('ofrece "todo el producto", las presentaciones y los colores de fábrica', () => {
    expect(opcionesAsociacion(destinos).map((o) => o.label)).toEqual([
      'Todo el producto',
      'Medida: 1 galón',
      'Medida: 1/4 de galón',
      'Color: Rojo colonial',
    ]);
    expect(opcionesAsociacion({ variantes: [], colores: [] })).toEqual([{ value: '', label: 'Todo el producto' }]);
  });

  it('convierte el valor del selector en la asociación y viceversa', () => {
    expect(aAsociacion('')).toEqual({ idVariante: null, idColor: null });
    expect(aAsociacion('v:4')).toEqual({ idVariante: 4, idColor: null });
    expect(aAsociacion('c:9')).toEqual({ idVariante: null, idColor: 9 });
    expect(valorDeAsociacion({ idVariante: 4, idColor: null })).toBe('v:4');
    expect(valorDeAsociacion({ idVariante: null, idColor: 9 })).toBe('c:9');
    expect(valorDeAsociacion({ idVariante: null, idColor: null })).toBe('');
  });

  it('un valor mal formado cae en "todo el producto", nunca en una asociación inventada', () => {
    for (const malo of ['x', 'v:', 'v:0', 'v:-3', 'c:abc', 'v:1.5', 'v:4:5', 'v:04', ' v:4']) {
      expect(aAsociacion(malo)).toEqual({ idVariante: null, idColor: null });
    }
  });

  it('rotula la asociación y avisa si el elemento ya no existe', () => {
    expect(etiquetaDeAsociacion({ idVariante: 5, idColor: null }, destinos)).toBe('Medida: 1/4 de galón');
    expect(etiquetaDeAsociacion({ idVariante: null, idColor: null }, destinos)).toBe('Todo el producto');
    expect(etiquetaDeAsociacion({ idVariante: 99, idColor: null }, destinos)).toBe(
      'Asociada a un elemento que ya no está',
    );
  });
});
