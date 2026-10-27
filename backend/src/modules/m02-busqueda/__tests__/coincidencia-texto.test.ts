import { describe, expect, it } from 'vitest';
import {
  distanciaEdicion,
  erroresTolerados,
  fuerzaCoincidencia,
  normalizarTexto,
  palabrasDeBusqueda,
} from '../services/coincidencia-texto';

describe('normalizarTexto (B3)', () => {
  it('quita acentos, mayúsculas y espacios de más', () => {
    expect(normalizarTexto('  Esmalte   SINTÉTICO  ')).toBe('esmalte sintetico');
  });
});

describe('palabrasDeBusqueda (B11)', () => {
  it('ignora las palabras cortas y las repetidas', () => {
    expect(palabrasDeBusqueda('vinilo de color blanco blanco')).toEqual(['vinilo', 'color', 'blanco']);
  });

  it('si todas son cortas, busca el término completo', () => {
    expect(palabrasDeBusqueda('a1')).toEqual(['a1']);
    expect(palabrasDeBusqueda('')).toEqual([]);
  });
});

describe('erroresTolerados (B13)', () => {
  it('ninguno con 3 letras, uno de 4 a 7 y dos desde 8', () => {
    expect([3, 4, 7, 8, 12].map(erroresTolerados)).toEqual([0, 1, 1, 2, 2]);
  });
});

describe('distanciaEdicion', () => {
  it('cuenta letras que faltan, sobran, cambian o se invierten', () => {
    expect(distanciaEdicion('vinilex', 'viniltex', 2)).toBe(1);
    expect(distanciaEdicion('barnis', 'barniz', 2)).toBe(1);
    expect(distanciaEdicion('brocah', 'brocha', 2)).toBe(1);
    expect(distanciaEdicion('koraza', 'koraza', 2)).toBe(0);
  });

  it('corta en cuanto supera el máximo', () => {
    expect(distanciaEdicion('pintura', 'rodillo', 1)).toBe(2);
    expect(distanciaEdicion('ab', 'abcdef', 1)).toBe(2);
  });
});

describe('fuerzaCoincidencia (B13)', () => {
  it('de la más fuerte a la más débil', () => {
    expect(fuerzaCoincidencia('viniltex', 'viniltex ultralavable')).toBe('exacta');
    expect(fuerzaCoincidencia('vinil', 'viniltex ultralavable')).toBe('contenida');
    expect(fuerzaCoincidencia('pinturas', 'pintura')).toBe('plural');
    expect(fuerzaCoincidencia('brocha', 'brochas')).toBe('contenida');
    expect(fuerzaCoincidencia('colores', 'color blanco')).toBe('plural');
    expect(fuerzaCoincidencia('vinilex', 'viniltex ultralavable')).toBe('aproximada');
    expect(fuerzaCoincidencia('ultralabable', 'viniltex ultralavable')).toBe('aproximada');
  });

  it('no trae resultados sin relación', () => {
    expect(fuerzaCoincidencia('ico', 'oca')).toBeNull();
    expect(fuerzaCoincidencia('rodillo', 'brocha de cerda natural')).toBeNull();
    expect(fuerzaCoincidencia('vinilo', '')).toBeNull();
  });
});
