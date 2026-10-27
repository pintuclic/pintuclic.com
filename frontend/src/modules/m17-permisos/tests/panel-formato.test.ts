import { describe, expect, it } from 'vitest';
import {
  barrasDeSerie,
  fechaCorta,
  formatoPesosCorto,
  resumenAccesibleSerie,
  tramosDeEstado,
  variacion,
} from '../services/panel-formato';

describe('variación frente al periodo anterior', () => {
  it('sube, baja y no cambia', () => {
    expect(variacion({ actual: 15, anterior: 10 })).toEqual({ texto: '+50 %', tipo: 'positive' });
    expect(variacion({ actual: 5, anterior: 10 })).toEqual({ texto: '−50 %', tipo: 'negative' });
    expect(variacion({ actual: 10, anterior: 10 })).toEqual({ texto: 'Sin cambio', tipo: 'neutral' });
  });

  it('sin periodo anterior no inventa un porcentaje', () => {
    expect(variacion({ actual: 4, anterior: 0 })).toEqual({ texto: 'Nuevo', tipo: 'positive' });
    expect(variacion({ actual: 0, anterior: 0 })).toEqual({ texto: 'Sin cambio', tipo: 'neutral' });
  });

  it('un cambio menor a medio punto cuenta como sin cambio', () => {
    expect(variacion({ actual: 1001, anterior: 1000 }).tipo).toBe('neutral');
  });
});

describe('formatos', () => {
  it('pesos completos hasta un millón y abreviados después', () => {
    expect(formatoPesosCorto(85900).replace(/\s/g, ' ')).toBe('$ 85.900');
    expect(formatoPesosCorto(2_350_000)).toBe('$ 2,4 M');
    expect(formatoPesosCorto(1_250_000_000)).toBe('$ 1.250 M');
  });

  it('fechaCorta', () => {
    expect(fechaCorta('2026-10-27')).toBe('27 oct');
    expect(fechaCorta('2026-01-05')).toBe('5 ene');
  });
});

describe('estados de las cotizaciones', () => {
  const porEstado = [
    { estado: 'solicitada', total: 3 },
    { estado: 'borrador', total: 1 },
    { estado: 'enviada', total: 2 },
    { estado: 'aprobada', total: 2 },
    { estado: 'rechazada', total: 1 },
    { estado: 'vencida', total: 1 },
  ] as const;

  it('junta «solicitada» y «borrador» en «En revisión» y suma 100 %', () => {
    const tramos = tramosDeEstado(porEstado);
    expect(tramos.map((t) => t.etiqueta)).toEqual(['En revisión', 'Respondidas', 'Aceptadas', 'Rechazadas', 'Vencidas']);
    expect(tramos[0]?.total).toBe(4);
    expect(tramos.reduce((s, t) => s + t.porcentaje, 0)).toBeCloseTo(100);
  });

  it('sin cotizaciones los porcentajes son 0 (no NaN)', () => {
    const tramos = tramosDeEstado(porEstado.map((e) => ({ ...e, total: 0 })));
    expect(tramos.every((t) => t.porcentaje === 0)).toBe(true);
  });
});

describe('gráfico de cotizaciones por día', () => {
  const serie = [
    { fecha: '2026-10-25', cotizaciones: 0, valor: 0 },
    { fecha: '2026-10-26', cotizaciones: 2, valor: 100 },
    { fecha: '2026-10-27', cotizaciones: 4, valor: 300 },
  ];

  it('la barra más alta ocupa todo el alto, un día sin nada no pinta y hoy es la última', () => {
    const { barras, maximo } = barrasDeSerie(serie, 300, 100);
    expect(maximo).toBe(4);
    expect(barras[2]?.alto).toBe(100);
    expect(barras[1]?.alto).toBe(50);
    expect(barras[0]?.alto).toBe(0);
    expect(barras.map((b) => b.esHoy)).toEqual([false, false, true]);
  });

  it('un día con una cotización entre muchas nunca queda invisible', () => {
    const { barras } = barrasDeSerie([{ fecha: 'a', cotizaciones: 1, valor: 1 }, { fecha: 'b', cotizaciones: 500, valor: 1 }], 100, 100);
    expect(barras[0]?.alto).toBeGreaterThanOrEqual(2);
  });

  it('las barras caben en la caja y no se solapan', () => {
    const { barras } = barrasDeSerie(Array.from({ length: 30 }, (_, i) => ({ fecha: `d${i}`, cotizaciones: 1, valor: 0 })), 600, 100);
    for (const [i, b] of barras.entries()) {
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x + b.ancho).toBeLessThanOrEqual(600 + 0.001);
      const siguiente = barras[i + 1];
      if (siguiente !== undefined) expect(b.x + b.ancho).toBeLessThanOrEqual(siguiente.x + 0.001);
    }
  });

  it('sin cotizaciones no revienta (alto 0) y el resumen lo dice', () => {
    const vacia = serie.map((p) => ({ ...p, cotizaciones: 0 }));
    expect(barrasDeSerie(vacia, 300, 100).barras.every((b) => b.alto === 0)).toBe(true);
    expect(resumenAccesibleSerie(vacia)).toMatch(/Sin cotizaciones/);
    expect(barrasDeSerie([], 300, 100).barras).toEqual([]);
  });

  it('el resumen accesible nombra el mejor día', () => {
    expect(resumenAccesibleSerie(serie)).toContain('27 oct');
    expect(resumenAccesibleSerie(serie)).toContain('6 cotizaciones');
  });
});
