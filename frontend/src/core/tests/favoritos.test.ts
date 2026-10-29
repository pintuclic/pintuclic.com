import { describe, expect, it } from 'vitest';
import { MAXIMO_FAVORITOS, alternarFavorito, leerFavoritos } from '../utils/favoritos';

describe('favoritos', () => {
  it('lee la lista guardada y descarta lo que no sirve', () => {
    expect(leerFavoritos(null)).toEqual([]);
    expect(leerFavoritos('[3,1,2]')).toEqual([3, 1, 2]);
    expect(leerFavoritos('[3,"x",-1,0,1.5,3,null,7]')).toEqual([3, 7]);
    expect(leerFavoritos('{"a":1}')).toEqual([]);
    expect(leerFavoritos('no es json')).toEqual([]);
  });

  it('no deja pasar más del máximo', () => {
    const muchos = JSON.stringify(Array.from({ length: MAXIMO_FAVORITOS + 10 }, (_, i) => i + 1));
    expect(leerFavoritos(muchos)).toHaveLength(MAXIMO_FAVORITOS);
  });

  it('agrega al principio y quita si ya estaba', () => {
    expect(alternarFavorito([2, 1], 5)).toEqual([5, 2, 1]);
    expect(alternarFavorito([5, 2, 1], 2)).toEqual([5, 1]);
    expect(alternarFavorito([], 9)).toEqual([9]);
  });

  it('con la lista llena sale el más viejo', () => {
    const llena = Array.from({ length: MAXIMO_FAVORITOS }, (_, i) => i + 1);
    const nueva = alternarFavorito(llena, 999);
    expect(nueva).toHaveLength(MAXIMO_FAVORITOS);
    expect(nueva[0]).toBe(999);
    expect(nueva).not.toContain(MAXIMO_FAVORITOS);
  });
});
