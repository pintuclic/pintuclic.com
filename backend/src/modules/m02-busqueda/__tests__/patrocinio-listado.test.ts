import { describe, expect, it } from 'vitest';
import { CUPO_PATROCINADOS_LISTADO } from '../dtos/m02-busqueda.dto';
import { CUPO_PATROCINADOS_LISTADO as CUPO_M14 } from '../../m14-patrocinios/dtos/m14-patrocinios.dto';
import { compararPorRelevancia, elegirPatrocinados, type Patrocinio } from '../services/patrocinio-listado';

/** Lógica pura del patrocinio en el listado de M02 (contrato M02 · O7; M14 · A8). */
const patro = (...filas: Array<[number, number, number]>): Map<number, Patrocinio> =>
  new Map(filas.map(([idProducto, prioridad, idCampania]) => [idProducto, { prioridad, idCampania }]));
const cand = (idProducto: number, puntaje = 1, nombre = `P${idProducto}`) => ({ idProducto, puntaje, nombre });

describe('M02 · cupo de patrocinados (O7)', () => {
  it('el cupo es el mismo que el de M14', () => {
    expect(CUPO_PATROCINADOS_LISTADO).toBe(CUPO_M14);
  });

  it('solo actúa con el orden por relevancia', () => {
    const p = patro([1, 50, 7]);
    expect(elegirPatrocinados([cand(1)], p, 'relevancia').size).toBe(1);
    for (const orden of ['precio_asc', 'precio_desc', 'novedad']) expect(elegirPatrocinados([cand(1)], p, orden).size).toBe(0);
  });

  it('solo elige entre los que ya son resultados: un patrocinado que no está entre los candidatos no entra', () => {
    expect([...elegirPatrocinados([cand(1)], patro([2, 90, 1]), 'relevancia').keys()]).toEqual([]);
  });

  it('con más patrocinados que el cupo pasan los de mayor prioridad y el resto se queda como uno normal', () => {
    const candidatos = Array.from({ length: 12 }, (_v, i) => cand(i + 1));
    const p = patro(...candidatos.map((c): [number, number, number] => [c.idProducto, c.idProducto * 10, 1]));
    const elegidos = [...elegirPatrocinados(candidatos, p, 'relevancia').keys()].sort((a, b) => a - b);
    expect(elegidos).toEqual([5, 6, 7, 8, 9, 10, 11, 12]);
    expect(elegirPatrocinados(candidatos, p, 'relevancia', 3).size).toBe(3);
  });

  it('a igual prioridad, entra primero el más pertinente y luego por nombre', () => {
    const candidatos = [cand(1, 1, 'Zeta'), cand(2, 5, 'Beta'), cand(3, 5, 'Alfa'), cand(4, 1, 'Gama')];
    const p = patro([1, 10, 1], [2, 10, 1], [3, 10, 1], [4, 10, 1]);
    expect([...elegirPatrocinados(candidatos, p, 'relevancia', 2).keys()].sort()).toEqual([2, 3]);
  });

  it('conserva la campaña de cada elegido, para medir', () => {
    expect(elegirPatrocinados([cand(1), cand(2)], patro([1, 5, 11], [2, 9, 22]), 'relevancia').get(2)).toEqual({ prioridad: 9, idCampania: 22 });
  });
});

describe('M02 · comparación por relevancia con patrocinio (O1, O7, CA-BUS-03-04)', () => {
  const elegidos = patro([1, 30, 1], [2, 80, 2]);
  const ordenar = (items: Array<{ idProducto: number; puntaje: number }>) =>
    [...items].sort((a, b) => compararPorRelevancia(a, b, elegidos) || a.idProducto - b.idProducto).map((x) => x.idProducto);

  it('la relevancia manda: un patrocinado menos pertinente NO pasa por delante de uno más pertinente', () => {
    expect(ordenar([{ idProducto: 1, puntaje: 3 }, { idProducto: 9, puntaje: 7 }])).toEqual([9, 1]);
  });

  it('con la misma relevancia el patrocinado va primero, y entre patrocinados el de mayor prioridad', () => {
    expect(ordenar([{ idProducto: 9, puntaje: 5 }, { idProducto: 1, puntaje: 5 }, { idProducto: 2, puntaje: 5 }])).toEqual([2, 1, 9]);
  });

  it('sin patrocinados no cambia nada: empate (0) para que siga el desempate por nombre', () => {
    expect(compararPorRelevancia({ idProducto: 8, puntaje: 5 }, { idProducto: 9, puntaje: 5 }, new Map())).toBe(0);
  });

  it('sin texto (todos con la misma relevancia) los patrocinados van primero', () => {
    expect(ordenar([{ idProducto: 5, puntaje: 1 }, { idProducto: 6, puntaje: 1 }, { idProducto: 1, puntaje: 1 }])).toEqual([1, 5, 6]);
  });
});
