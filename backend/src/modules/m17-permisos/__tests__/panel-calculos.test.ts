import { describe, expect, it } from 'vitest';
import {
  armarSerie,
  comparar,
  ctr,
  diaColombia,
  estadosCompletos,
  inicioDiaColombia,
  rangosDelPeriodo,
  sumarDias,
  tasaAprobacion,
} from '../services/panel-calculos';

describe('días de Colombia (UTC-5, R2)', () => {
  it('a las 23:30 en Colombia todavía es el mismo día aunque en UTC ya sea el siguiente', () => {
    expect(diaColombia(new Date('2026-10-27T04:30:00Z'))).toBe('2026-10-26');
    expect(diaColombia(new Date('2026-10-27T05:00:00Z'))).toBe('2026-10-27');
  });

  it('el día empieza a las 05:00 UTC', () => {
    expect(inicioDiaColombia('2026-10-27').toISOString()).toBe('2026-10-27T05:00:00.000Z');
  });

  it('sumarDias cruza meses y años', () => {
    expect(sumarDias('2026-12-30', 3)).toBe('2027-01-02');
    expect(sumarDias('2026-03-02', -3)).toBe('2026-02-27');
  });

  it('el periodo cubre exactamente N días hasta el final de hoy y el anterior es contiguo', () => {
    const r = rangosDelPeriodo(new Date('2026-10-27T15:00:00Z'), 7);
    expect(r.hoy).toBe('2026-10-27');
    expect(r.hasta.toISOString()).toBe('2026-10-28T05:00:00.000Z');
    expect(r.desde.toISOString()).toBe('2026-10-21T05:00:00.000Z');
    expect(r.anteriorDesde.toISOString()).toBe('2026-10-14T05:00:00.000Z');
  });
});

describe('serie diaria (R4)', () => {
  const rangos = rangosDelPeriodo(new Date('2026-10-27T15:00:00Z'), 7);

  it('tiene un punto por día, del más viejo al de hoy, con ceros donde no hay nada', () => {
    const serie = armarSerie([], rangos);
    expect(serie).toHaveLength(7);
    expect(serie[0]?.fecha).toBe('2026-10-21');
    expect(serie[6]?.fecha).toBe('2026-10-27');
    expect(serie.every((p) => p.cotizaciones === 0 && p.valor === 0)).toBe(true);
  });

  it('agrupa por día de Colombia, no de UTC', () => {
    const serie = armarSerie(
      [
        { fecha: new Date('2026-10-27T04:59:00Z'), valor: 100 }, // 26 en Colombia
        { fecha: new Date('2026-10-27T05:00:00Z'), valor: 50.5 }, // 27
        { fecha: new Date('2026-10-27T20:00:00Z'), valor: 49.5 }, // 27
      ],
      rangos,
    );
    expect(serie.find((p) => p.fecha === '2026-10-26')).toMatchObject({ cotizaciones: 1, valor: 100 });
    expect(serie.find((p) => p.fecha === '2026-10-27')).toMatchObject({ cotizaciones: 2, valor: 100 });
  });

  it('ignora lo que cae fuera del periodo', () => {
    const serie = armarSerie([{ fecha: new Date('2026-09-01T12:00:00Z'), valor: 999 }], rangos);
    expect(serie.reduce((s, p) => s + p.cotizaciones, 0)).toBe(0);
  });
});

describe('tasas y comparaciones', () => {
  it('tasaAprobacion: aprobadas ÷ (aprobadas + rechazadas + vencidas), un decimal', () => {
    expect(tasaAprobacion(new Map([['aprobada', 1], ['rechazada', 1], ['vencida', 1]]))).toBe(33.3);
    expect(tasaAprobacion(new Map([['aprobada', 3]]))).toBe(100);
  });

  it('tasaAprobacion: las enviadas y solicitadas no cuentan; sin resueltas es null', () => {
    expect(tasaAprobacion(new Map([['enviada', 9], ['solicitada', 4]]))).toBeNull();
    expect(tasaAprobacion(new Map())).toBeNull();
  });

  it('estadosCompletos trae los seis estados siempre y en orden', () => {
    const r = estadosCompletos(new Map([['aprobada', 2]]));
    expect(r.map((e) => e.estado)).toEqual(['solicitada', 'borrador', 'enviada', 'aprobada', 'rechazada', 'vencida']);
    expect(r.find((e) => e.estado === 'aprobada')?.total).toBe(2);
    expect(r.find((e) => e.estado === 'vencida')?.total).toBe(0);
  });

  it('ctr: clics ÷ impresiones; null sin impresiones', () => {
    expect(ctr(1, 3)).toBe(33.3);
    expect(ctr(0, 0)).toBeNull();
    expect(ctr(5, 0)).toBeNull();
  });

  it('comparar redondea a centavos', () => {
    expect(comparar(10.004, 3)).toEqual({ actual: 10, anterior: 3 });
  });
});
