import { describe, expect, it } from 'vitest';
import { ESTADOS_ORDEN, verificarLineasRequestSchema } from '../dtos/m09-cumplimiento.dto';
import {
  describirLinea,
  esEstadoDeCumplimiento,
  estadoDeLinea,
  motivosDeRetencion,
  todasDisponibles,
} from '../services/reglas-cumplimiento';
import { linea } from './repo-memoria';

const base = { nombreProducto: 'Vinilo', varianteCopia: 'Galón' };

function conRegistros(...estados: Array<'disponible' | 'consiguiendo_stock' | 'no_disponible'>) {
  const l = linea(1, base);
  l.registros = estados.map((estado, i) => ({ estado, autor: 'Luis', fecha: new Date(2026, 9, 30, 8, i) }));
  return l;
}

describe('reglas de M09', () => {
  it('el estado de una línea es su último registro; sin registros, pendiente (R2, R3)', () => {
    expect(estadoDeLinea(conRegistros())).toBe('pendiente');
    expect(estadoDeLinea(conRegistros('disponible'))).toBe('disponible');
    expect(estadoDeLinea(conRegistros('disponible', 'consiguiendo_stock'))).toBe('consiguiendo_stock');
    expect(estadoDeLinea(conRegistros('no_disponible', 'consiguiendo_stock', 'disponible'))).toBe('disponible');
  });

  it('solo cuentan como completas las órdenes con TODAS las líneas disponibles, y nunca una vacía (R7)', () => {
    expect(todasDisponibles([conRegistros('disponible'), conRegistros('disponible')])).toBe(true);
    expect(todasDisponibles([conRegistros('disponible'), conRegistros('consiguiendo_stock')])).toBe(false);
    expect(todasDisponibles([conRegistros('disponible'), conRegistros()])).toBe(false);
    expect(todasDisponibles([conRegistros('disponible', 'no_disponible')])).toBe(false);
    expect(todasDisponibles([])).toBe(false);
  });

  it('los estados donde M09 opera son exactamente tres (R4)', () => {
    const operables = ESTADOS_ORDEN.filter(esEstadoDeCumplimiento);
    expect(operables).toEqual(['revision_disponibilidad', 'en_preparacion', 'preparada']);
  });

  it('el motivo de retención nombra cada línea que no está disponible y su estado (R12)', () => {
    const lineas = [conRegistros('disponible'), conRegistros('consiguiendo_stock'), conRegistros()];
    lineas[1] = { ...lineas[1]!, nombreProducto: 'Brocha', varianteCopia: 'Unidad' };

    expect(motivosDeRetencion(lineas)).toEqual([
      { descripcion: 'Brocha — Unidad', estado: 'consiguiendo_stock' },
      { descripcion: 'Vinilo — Galón', estado: 'pendiente' },
    ]);
    expect(describirLinea(base)).toBe('Vinilo — Galón');
  });

  describe('la petición de marcar (R2, R5)', () => {
    const valida = (lineas: unknown) => verificarLineasRequestSchema.safeParse({ lineas }).success;

    it('acepta las tres marcas, una o varias líneas', () => {
      expect(valida([{ numeroLinea: 1, estado: 'disponible' }])).toBe(true);
      expect(valida([{ numeroLinea: 1, estado: 'consiguiendo_stock' }, { numeroLinea: 2, estado: 'no_disponible' }])).toBe(true);
    });

    it.each([
      ['lista vacía', []],
      ['volver a pendiente a mano', [{ numeroLinea: 1, estado: 'pendiente' }]],
      ['una marca que no existe', [{ numeroLinea: 1, estado: 'parcial' }]],
      ['el booleano anterior', [{ numeroLinea: 1, disponible: true }]],
      ['una línea repetida', [{ numeroLinea: 1, estado: 'disponible' }, { numeroLinea: 1, estado: 'no_disponible' }]],
      ['línea 0', [{ numeroLinea: 0, estado: 'disponible' }]],
      ['línea con decimales', [{ numeroLinea: 1.5, estado: 'disponible' }]],
      ['más de 200 líneas', Array.from({ length: 201 }, (_, i) => ({ numeroLinea: i + 1, estado: 'disponible' }))],
    ])('rechaza %s', (_nombre, lineas) => {
      expect(valida(lineas)).toBe(false);
    });
  });
});
