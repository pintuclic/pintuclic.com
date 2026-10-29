import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { CifrasVenta } from '../dtos/m19-reportes.dto';
import type { ReportesRepositoryPort } from '../interfaces/reportes.interface';
import { BOM, aCsv, celdaCsv } from '../services/csv';
import { csvResumen } from '../services/exportacion';
import { hoyEnColombia, inicioDeIntervalo, intervalosDelRango, periodoAnterior, resolverPeriodo } from '../services/fechas';
import { ReportesService, variacion } from '../services/reportes.service';

const RAIZ = resolve(__dirname, '../../../../../');

describe('M19 · fechas (R1, R4, R5)', () => {
  const ahora = new Date('2026-10-29T03:00:00.000Z'); // 28 de octubre, 22:00 en Colombia

  it('hoy es el de Colombia, no el de UTC', () => {
    expect(hoyEnColombia(ahora)).toBe('2026-10-28');
  });

  it('sin fechas: los últimos 30 días contando hoy', () => {
    expect(resolverPeriodo(undefined, undefined, ahora)).toEqual({ desde: '2026-09-29', hasta: '2026-10-28', dias: 30 });
  });

  it('rechaza fechas que no existen, al revés o demasiado largas', () => {
    expect(() => resolverPeriodo('2026-02-30', '2026-03-05', ahora)).toThrow(/fechas reales/);
    expect(() => resolverPeriodo('2026-10-10', '2026-10-01', ahora)).toThrow(/anterior/);
    expect(() => resolverPeriodo('2025-01-01', '2026-10-01', ahora)).toThrow(/366/);
    expect(resolverPeriodo('2026-01-01', '2026-12-31', ahora).dias).toBe(365);
  });

  it('R4: el periodo anterior tiene la misma duración y termina el día antes', () => {
    expect(periodoAnterior({ desde: '2026-10-01', hasta: '2026-10-07', dias: 7 })).toEqual({ desde: '2026-09-24', hasta: '2026-09-30', dias: 7 });
  });

  it('R5: la semana empieza el lunes, el mes el 1 y el año el 1 de enero', () => {
    expect(inicioDeIntervalo('2026-10-28', 'semana')).toBe('2026-10-26'); // miércoles → lunes
    expect(inicioDeIntervalo('2026-11-01', 'semana')).toBe('2026-10-26'); // domingo → su lunes
    expect(inicioDeIntervalo('2026-10-28', 'mes')).toBe('2026-10-01');
    expect(inicioDeIntervalo('2026-10-28', 'anio')).toBe('2026-01-01');
  });

  it('R5: los intervalos no dejan huecos y los de los extremos son completos', () => {
    expect(intervalosDelRango({ desde: '2026-10-28', hasta: '2026-11-10', dias: 14 }, 'semana')).toEqual(['2026-10-26', '2026-11-02', '2026-11-09']);
    expect(intervalosDelRango({ desde: '2026-01-15', hasta: '2026-04-02', dias: 78 }, 'mes')).toEqual(['2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01']);
    expect(intervalosDelRango({ desde: '2024-06-01', hasta: '2026-06-01', dias: 731 }, 'anio')).toEqual(['2024-01-01', '2025-01-01', '2026-01-01']);
  });

  it('R5: más de 400 puntos es un rango inválido', () => {
    expect(() => intervalosDelRango({ desde: '2024-01-01', hasta: '2026-12-31', dias: 1096 }, 'dia')).toThrow(/400/);
  });
});

describe('M19 · CSV (R11)', () => {
  it('lleva BOM, separador ; y coma decimal, y escapa comillas y saltos de línea', () => {
    const csv = aCsv(['Nombre', 'Total'], [['Pintura "premium"; 1 galón', 12.5], ['Otro', null]]);
    expect(csv.startsWith(BOM)).toBe(true);
    expect(csv).toContain('Nombre;Total');
    expect(csv).toContain('"Pintura ""premium""; 1 galón";12,5');
    expect(csv).toContain('Otro;\r\n');
  });

  it('antepone una comilla a lo que parezca una fórmula, pero no a los números negativos', () => {
    for (const peligro of ['=SUMA(A1)', '+57 300', '-2+3', '@usuario', '\tTAB']) expect(celdaCsv(peligro)).toMatch(/^'/);
    expect(celdaCsv(-3.5)).toBe('-3,5');
    expect(celdaCsv('Normal')).toBe('Normal');
  });
});

describe('M19 · variación (R4)', () => {
  it('con un decimal, y null si el anterior es 0 o no hay dato', () => {
    expect(variacion(150, 100)).toBe(50);
    expect(variacion(90, 120)).toBe(-25);
    expect(variacion(1, 3)).toBe(-66.7);
    expect(variacion(10, 0)).toBeNull();
    expect(variacion(null, 5)).toBeNull();
  });
});

const CIFRAS = (o: Partial<CifrasVenta>): CifrasVenta => ({ ordenes: 0, unidades: 0, ventasBrutas: 0, descuentos: 0, envio: 0, baseSinIva: 0, iva: 0, totalCobrado: 0, ticketPromedio: null, ...o });

describe('M19 · servicio con un repositorio simulado', () => {
  const llamadas: string[] = [];
  const repo: ReportesRepositoryPort = {
    cifras: async (r) => {
      llamadas.push(`cifras ${r.desde}..${r.hasta}`);
      return r.desde === '2026-10-01' ? CIFRAS({ ordenes: 3, unidades: 9, totalCobrado: 300000, ticketPromedio: 100000 }) : CIFRAS({ ordenes: 2, unidades: 4, totalCobrado: 200000, ticketPromedio: 100000 });
    },
    porEstado: async () => [{ estado: 'entregado', ordenes: 3, total: 300000 }, { estado: 'cancelado', ordenes: 1, total: 50000 }],
    serie: async () => [{ periodo: '2026-10-02', ordenes: 2, unidades: 5, totalCobrado: 150000 }],
    ventasPor: async () => ({
      filas: [{ clave: 'a', etiqueta: 'A', ordenes: 2, unidades: 6, importe: 75 }, { clave: 'b', etiqueta: 'B', ordenes: 1, unidades: 3, importe: 25 }],
      total: { ordenes: 3, unidades: 9, importe: 100 },
    }),
    descuentos: async () => ({ totalDescuentos: 0, filas: [] }),
    topClientes: async () => ({ filas: [] }),
    compradores: async () => ({ compradores: 0, nuevos: 0, recurrentes: 0, compraronMasDeUnaVez: 0, ordenesPorComprador: null }),
    postventa: async () => ({ solicitudes: 0, porTipo: [], porEstado: [], reembolsos: { cantidad: 0, totalReembolsado: 0 } }),
    facturacion: async () => ({ ventas: 0, conComprobante: 0, sinComprobante: 0, ultimoNumero: null }),
  };
  const servicio = new ReportesService(repo, () => new Date('2026-10-28T15:00:00.000Z'));

  it('R4: el resumen compara con el periodo anterior y trae los ocho estados siempre', async () => {
    const r = await servicio.resumen({ desde: '2026-10-01', hasta: '2026-10-07', formato: 'json' });
    expect(llamadas).toContain('cifras 2026-09-24..2026-09-30');
    expect(r.variacion).toEqual({ ordenes: 50, unidades: 125, totalCobrado: 50, ticketPromedio: 0 });
    expect(r.porEstado).toHaveLength(8);
    expect(r.porEstado.find((e) => e.estado === 'preparada')).toEqual({ estado: 'preparada', ordenes: 0, total: 0 });
    expect(r.porEstado.find((e) => e.estado === 'cancelado')?.ordenes).toBe(1);
  });

  it('R5: la serie rellena los días sin ventas con ceros', async () => {
    const s = await servicio.serie({ desde: '2026-10-01', hasta: '2026-10-04', agrupar: 'dia', formato: 'json' });
    expect(s.puntos.map((p) => [p.periodo, p.totalCobrado])).toEqual([['2026-10-01', 0], ['2026-10-02', 150000], ['2026-10-03', 0], ['2026-10-04', 0]]);
  });

  it('R5: la serie admite rangos de varios años; los demás reportes, no', async () => {
    expect((await servicio.serie({ desde: '2022-01-01', hasta: '2026-12-31', agrupar: 'anio', formato: 'json' })).puntos).toHaveLength(5);
    await expect(servicio.resumen({ desde: '2022-01-01', hasta: '2026-12-31', formato: 'json' })).rejects.toMatchObject({ status: 400, code: 'RANGO_INVALIDO' });
  });

  it('R6: la participación sale del total de la dimensión', async () => {
    const v = await servicio.ventasPor('categoria', { desde: '2026-10-01', hasta: '2026-10-07', formato: 'json', orden: 'importe', limite: 20 });
    expect(v.filas.map((f) => f.participacion)).toEqual([75, 25]);
  });

  it('R11: el CSV del resumen trae los mismos indicadores', async () => {
    const csv = csvResumen(await servicio.resumen({ desde: '2026-10-01', hasta: '2026-10-07', formato: 'json' }));
    expect(csv).toContain('Total cobrado;300000;200000;50');
    expect(csv).toContain('Órdenes cancelada;1');
  });
});

describe('M19 · espejo del contrato', () => {
  it('el DTO del backend es espejo exacto del contrato', () => {
    const limpiar = (t: string) => t.replace(/\/\*\*[\s\S]*?\*\//g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim();
    expect(limpiar(readFileSync(resolve(__dirname, '../dtos/m19-reportes.dto.ts'), 'utf8'))).toBe(limpiar(readFileSync(resolve(RAIZ, 'contracts/m19-reportes.contract.ts'), 'utf8')));
  });
});
