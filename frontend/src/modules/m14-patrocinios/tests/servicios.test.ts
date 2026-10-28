import { describe, expect, it } from 'vitest';
import type { Campania } from '../dtos/m14-patrocinios.dto';
import { formatearFecha, hoyBogota, resumenVigencia, sumarDias } from '../services/etiquetas';
import {
  aCuerpoCampania,
  borradorDesdeCampania,
  borradorVacio,
  parsearPrioridad,
  type BorradorCampania,
} from '../services/formularios';
import { limpiarParametros } from '../services/patrocinios-api';

const valido = (extra: Partial<BorradorCampania> = {}): BorradorCampania => ({
  ...borradorVacio('2026-11-01'),
  nombre: 'Pintuco · Verano',
  objetivos: [{ tipo: 'marca', id: 1, nombre: 'Pintuco' }],
  ...extra,
});

describe('M14 · fechas', () => {
  it('formatea AAAA-MM-DD como DD/MM/AAAA sin pasar por el huso del navegador', () => {
    expect(formatearFecha('2026-11-04')).toBe('04/11/2026');
    expect(formatearFecha('rara')).toBe('rara');
  });

  it('resume la vigencia: un solo día o un rango', () => {
    expect(resumenVigencia('2026-11-04', '2026-11-04')).toBe('El 04/11/2026');
    expect(resumenVigencia('2026-11-04', '2026-11-30')).toBe('Del 04/11/2026 al 30/11/2026');
  });

  it('hoy en Colombia (UTC-5): a las 02:00 UTC todavía es el día anterior', () => {
    expect(hoyBogota(new Date('2026-11-04T02:00:00Z'))).toBe('2026-11-03');
    expect(hoyBogota(new Date('2026-11-04T05:00:00Z'))).toBe('2026-11-04');
  });

  it('suma días cruzando fin de mes y de año', () => {
    expect(sumarDias('2026-11-01', 29)).toBe('2026-11-30');
    expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01');
    expect(sumarDias('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('M14 · prioridad', () => {
  it('vacío = 0; solo enteros de hasta tres cifras', () => {
    expect(parsearPrioridad('')).toBe(0);
    expect(parsearPrioridad(' 40 ')).toBe(40);
    expect(parsearPrioridad('4,5')).toBeNull();
    expect(parsearPrioridad('-1')).toBeNull();
    expect(parsearPrioridad('abc')).toBeNull();
    expect(parsearPrioridad('1000')).toBeNull();
  });
});

describe('M14 · del borrador al cuerpo del contrato', () => {
  it('una campaña nueva empieza hoy, dura 30 días y sale en el catálogo', () => {
    const b = borradorVacio('2026-11-01');
    expect([b.fechaInicio, b.fechaFin, b.prioridad, b.ubicaciones]).toEqual(['2026-11-01', '2026-11-30', '0', ['listado']]);
  });

  it('un borrador completo se convierte al cuerpo del contrato', () => {
    const r = aCuerpoCampania(valido({ descripcion: '  ', prioridad: '40', ubicaciones: ['listado', 'inicio'] }));
    expect(r).toEqual({
      ok: true,
      valor: {
        nombre: 'Pintuco · Verano',
        descripcion: null,
        objetivos: [{ tipo: 'marca', id: 1 }],
        fechaInicio: '2026-11-01',
        fechaFin: '2026-11-30',
        prioridad: 40,
        ubicaciones: ['listado', 'inicio'],
      },
    });
  });

  it('cada falta se explica en español, en el orden en que la persona la ve', () => {
    const mensaje = (extra: Partial<BorradorCampania>) => {
      const r = aCuerpoCampania(valido(extra));
      return r.ok ? 'ok' : r.mensaje;
    };
    expect(mensaje({ nombre: 'ab' })).toMatch(/nombre/);
    expect(mensaje({ objetivos: [] })).toMatch(/producto, una línea o una marca/);
    expect(mensaje({ fechaFin: '' })).toMatch(/fecha/);
    expect(mensaje({ fechaInicio: '2026-12-01', fechaFin: '2026-11-01' })).toMatch(/anterior al inicio/);
    expect(mensaje({ prioridad: '101' })).toMatch(/0 a 100/);
    expect(mensaje({ prioridad: 'alta' })).toMatch(/0 a 100/);
    expect(mensaje({ ubicaciones: [] })).toMatch(/lugar/);
  });

  it('una campaña de un solo día es válida', () => {
    expect(aCuerpoCampania(valido({ fechaInicio: '2026-11-15', fechaFin: '2026-11-15' })).ok).toBe(true);
  });

  it('el borrador de una campaña guardada trae sus datos y vuelve a convertirse igual', () => {
    const c: Campania = {
      idCampania: 7,
      nombre: 'Campaña guardada',
      descripcion: 'Verano',
      estado: 'activo',
      situacion: 'vigente',
      fechaInicio: '2026-11-01',
      fechaFin: '2026-11-30',
      prioridad: 55,
      ubicaciones: ['inicio'],
      objetivos: [
        { tipo: 'linea', id: 3, nombre: 'Pintuco · Viniltex', existe: true },
        { tipo: 'producto', id: 9, nombre: 'Pintuco · Koraza', existe: true },
      ],
      fechaCreacion: '2026-10-01T00:00:00.000Z',
      fechaActualizacion: '2026-10-01T00:00:00.000Z',
      actualizadoPor: null,
    };
    const b = borradorDesdeCampania(c);
    expect(b).toMatchObject({ prioridad: '55', descripcion: 'Verano', ubicaciones: ['inicio'] });
    const r = aCuerpoCampania(b);
    expect(r.ok && r.valor.objetivos).toEqual([{ tipo: 'linea', id: 3 }, { tipo: 'producto', id: 9 }]);
  });
});

describe('M14 · parámetros de la API', () => {
  it('no envía filtros vacíos', () => {
    expect(limpiarParametros({ busqueda: '', situacion: 'vigente', ubicacion: undefined, pagina: 1 })).toEqual({
      situacion: 'vigente',
      pagina: 1,
    });
  });
});
