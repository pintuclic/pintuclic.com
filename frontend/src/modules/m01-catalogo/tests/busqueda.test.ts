import { describe, expect, it } from 'vitest';
import { filtrarOpciones, normalizarBusqueda } from '../services/busqueda';

const OPCIONES = [
  { value: '1', label: 'Vinilos para muros', detalle: 'Pinturas' },
  { value: '2', label: 'Esmaltes', detalle: 'Pinturas' },
  { value: '3', label: 'Barnices', detalle: 'Maderas' },
  { value: '4', label: 'Pañetes' },
];

describe('M01 · buscador de los selectores', () => {
  it('ignora tildes y mayúsculas', () => {
    expect(normalizarBusqueda('  PañETES ')).toBe('panetes');
    expect(filtrarOpciones(OPCIONES, 'panete').map((o) => o.value)).toEqual(['4']);
    expect(filtrarOpciones(OPCIONES, 'ESMALTE').map((o) => o.value)).toEqual(['2']);
  });

  it('sin texto devuelve todas, en su orden', () => {
    expect(filtrarOpciones(OPCIONES, '  ').map((o) => o.value)).toEqual(['1', '2', '3', '4']);
  });

  it('busca también en el detalle y exige todas las palabras', () => {
    expect(filtrarOpciones(OPCIONES, 'pinturas').map((o) => o.value)).toEqual(['1', '2']);
    expect(filtrarOpciones(OPCIONES, 'pinturas muros').map((o) => o.value)).toEqual(['1']);
    expect(filtrarOpciones(OPCIONES, 'madera esmalte')).toEqual([]);
  });
});
