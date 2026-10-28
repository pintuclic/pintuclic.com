import { describe, expect, it } from 'vitest';
import { imagenParaSeleccion } from '../services/galeria';

const imagenes = [
  { idImagen: 1, idVariante: null, idColor: null },
  { idImagen: 2, idVariante: 10, idColor: null },
  { idImagen: 3, idVariante: null, idColor: 77 },
];

describe('M01 · imagen de la selección en la ficha (I6)', () => {
  it('el color elegido manda sobre la presentación', () => {
    expect(imagenParaSeleccion(imagenes, { idColor: 77, idVariante: 10 })).toBe(3);
  });

  it('sin imagen del color, usa la de la presentación', () => {
    expect(imagenParaSeleccion(imagenes, { idColor: 5, idVariante: 10 })).toBe(2);
    expect(imagenParaSeleccion(imagenes, { idColor: null, idVariante: 10 })).toBe(2);
  });

  it('sin nada asociado a la elección no cambia la galería', () => {
    expect(imagenParaSeleccion(imagenes, { idColor: 5, idVariante: 99 })).toBeNull();
    expect(imagenParaSeleccion(imagenes, { idColor: null, idVariante: null })).toBeNull();
    expect(imagenParaSeleccion([], { idColor: 77, idVariante: 10 })).toBeNull();
  });
});
