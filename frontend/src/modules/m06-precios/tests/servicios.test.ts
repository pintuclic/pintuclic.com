import { describe, expect, it } from 'vitest';
import type { CalendarioEvento, Evento } from '../dtos/m06-precios.dto';
import {
  aInstanteBogota,
  deInstanteBogota,
  formatearFechaCalendario,
  formatearPesos,
  formatearPorcentaje,
  resumenCalendario,
  resumenDias,
} from '../services/etiquetas';
import {
  aCuerpoCupon,
  aCuerpoEvento,
  aCuerpoTipoCliente,
  borradorDesdeEvento,
  borradorVacio,
  cuponVacio,
  reglaVacia,
  tipoClienteVacio,
  type BorradorEvento,
} from '../services/formularios';
import { parsearDinero, parsearEntero, parsearPorcentaje } from '../services/numeros';

const marca = { tipo: 'marca' as const, id: 1, nombre: 'Pintuco' };
const linea = { tipo: 'linea' as const, id: 3, nombre: 'Pintuco · Viniltex' };
const blancos = { tipo: 'familia_color' as const, id: 1, nombre: 'Blancos' };

function borrador(sobre: Partial<BorradorEvento> = {}): BorradorEvento {
  return {
    ...borradorVacio('2026-11-04'),
    nombre: 'Miércoles de color',
    diasSemana: [3],
    reglas: [{ ...reglaVacia(), tipoObjetivo: 'linea', objetivo: linea, porcentaje: '15', exclusiones: [] }],
    ...sobre,
  };
}

describe('números escritos por una persona', () => {
  it('porcentaje: acepta coma o punto, hasta 2 decimales, mayor que 0 y hasta 100', () => {
    expect(parsearPorcentaje('15')).toBe(15);
    expect(parsearPorcentaje('12,5')).toBe(12.5);
    expect(parsearPorcentaje('12.55 %')).toBe(12.55);
    for (const malo of ['', '0', '100,01', '12,555', '-5', 'abc', '1e2']) expect(parsearPorcentaje(malo)).toBeNull();
    expect(parsearPorcentaje('100')).toBe(100);
  });

  it('dinero: entiende "300000", "300.000", "1.234.567,50" y "1234,5"', () => {
    expect(parsearDinero('300000')).toBe(300000);
    expect(parsearDinero('300.000')).toBe(300000);
    expect(parsearDinero('$ 1.234.567,50')).toBe(1234567.5);
    expect(parsearDinero('1234,5')).toBe(1234.5);
    expect(parsearDinero('0')).toBe(0);
    for (const malo of ['', 'abc', '-1', '1,234,567', '10,123', '99999999999']) expect(parsearDinero(malo)).toBeNull();
  });

  it('entero: solo dígitos', () => {
    expect(parsearEntero(' 42 ')).toBe(42);
    for (const malo of ['', '4,5', '-1', 'x']) expect(parsearEntero(malo)).toBeNull();
  });
});

describe('textos del calendario', () => {
  it('resume los días', () => {
    expect(resumenDias([])).toBe('Todos los días');
    expect(resumenDias([1, 2, 3, 4, 5, 6, 7])).toBe('Todos los días');
    expect(resumenDias([3])).toBe('Los miércoles');
    expect(resumenDias([5, 1, 3])).toBe('Los lunes, miércoles y viernes');
  });

  it('resume el calendario completo', () => {
    const base: CalendarioEvento = {
      fechaInicio: '2026-11-04',
      fechaFin: null,
      diasSemana: [3],
      horaInicio: '08:00',
      horaFin: '20:00',
    };
    expect(resumenCalendario(base)).toBe('Los miércoles · 08:00 a 20:00 · desde el 04/11/2026');
    expect(
      resumenCalendario({ ...base, diasSemana: [], horaInicio: null, horaFin: null, fechaFin: '2026-11-30' }),
    ).toBe('Todos los días · Todo el día · del 04/11/2026 al 30/11/2026');
    expect(
      resumenCalendario({ ...base, diasSemana: [], horaInicio: null, horaFin: null, fechaFin: '2026-11-04' }),
    ).toBe('Todos los días · Todo el día · el 04/11/2026');
  });

  it('formatea pesos: sin decimales si es exacto y con dos si hay centavos', () => {
    const sinEspacios = (t: string): string => t.replace(/\s/g, ' ');
    expect(sinEspacios(formatearPesos(85900))).toBe('$ 85.900');
    expect(sinEspacios(formatearPesos(124125.5))).toBe('$ 124.125,50');
    expect(sinEspacios(formatearPesos(0.04))).toBe('$ 0,04');
  });

  it('formatea fechas de calendario y porcentajes', () => {
    expect(formatearFechaCalendario('2026-01-09')).toBe('09/01/2026');
    expect(formatearPorcentaje(15)).toBe('15 %');
    expect(formatearPorcentaje(12.5)).toBe('12,5 %');
  });

  it('convierte entre la hora de Colombia y el instante UTC en ambos sentidos', () => {
    expect(aInstanteBogota('2026-11-04T10:00')).toBe('2026-11-04T15:00:00.000Z');
    expect(aInstanteBogota('2026-11-04T20:30')).toBe('2026-11-05T01:30:00.000Z');
    expect(deInstanteBogota('2026-11-05T01:30:00.000Z')).toBe('2026-11-04T20:30');
    expect(aInstanteBogota('mañana')).toBeNull();
  });
});

describe('formulario de evento', () => {
  it('arma el cuerpo del contrato: "Miércoles de color" con excepciones', () => {
    const r = aCuerpoEvento(
      borrador({
        horaInicio: '08:00',
        horaFin: '20:00',
        reglas: [
          {
            ...reglaVacia(),
            tipoObjetivo: 'linea',
            objetivo: linea,
            porcentaje: '15',
            exclusiones: [{ tipo: 'producto', id: 9, nombre: 'P' }],
          },
          { ...reglaVacia(), tipoObjetivo: 'marca', objetivo: marca, porcentaje: '12,5', exclusiones: [] },
        ],
        exclusiones: [blancos],
      }),
    );
    expect(r).toEqual({
      ok: true,
      valor: {
        nombre: 'Miércoles de color',
        descripcion: null,
        calendario: {
          fechaInicio: '2026-11-04',
          fechaFin: null,
          diasSemana: [3],
          horaInicio: '08:00',
          horaFin: '20:00',
        },
        reglas: [
          { objetivo: { tipo: 'linea', id: 3 }, porcentaje: 15, exclusiones: [{ tipo: 'producto', id: 9 }] },
          { objetivo: { tipo: 'marca', id: 1 }, porcentaje: 12.5, exclusiones: [] },
        ],
        exclusiones: [{ tipo: 'familia_color', id: 1 }],
      },
    });
  });

  it('"Todo el catálogo" no lleva objetivo', () => {
    const r = aCuerpoEvento(
      borrador({
        reglas: [{ ...reglaVacia(), tipoObjetivo: 'todo', objetivo: null, porcentaje: '5', exclusiones: [] }],
      }),
    );
    expect(r.ok && r.valor.reglas[0]?.objetivo).toBeNull();
  });

  it.each([
    ['nombre corto', { nombre: 'ab' }, /nombre/],
    ['sin fecha de inicio', { fechaInicio: '' }, /inicio/],
    ['fin antes del inicio', { fechaFin: '2026-10-01' }, /fin/],
    ['una sola hora', { horaInicio: '08:00' }, /horas/],
    ['hora fin antes de inicio', { horaInicio: '20:00', horaFin: '08:00' }, /hora de fin/],
    ['sin descuentos', { reglas: [] }, /al menos un descuento/],
    ['sin elegir objetivo', { reglas: [{ ...reglaVacia(), porcentaje: '10' }] }, /Descuento 1: elija/],
    [
      'porcentaje malo',
      { reglas: [{ ...reglaVacia(), objetivo: marca, porcentaje: '150' }] },
      /Descuento 1: el porcentaje/,
    ],
  ])('rechaza con un mensaje claro: %s', (_n, sobre, mensaje) => {
    const r = aCuerpoEvento(borrador(sobre));
    expect(r.ok).toBe(false);
    expect(!r.ok && r.mensaje).toMatch(mensaje);
  });

  it('ida y vuelta: un evento de la API vuelve a ser el mismo cuerpo', () => {
    const evento: Evento = {
      idEvento: 7,
      nombre: 'Miércoles de color',
      descripcion: 'Semanal',
      estado: 'activo',
      situacion: 'en_curso',
      calendario: {
        fechaInicio: '2026-11-04',
        fechaFin: '2026-12-30',
        diasSemana: [3],
        horaInicio: null,
        horaFin: null,
      },
      reglas: [{ idRegla: 1, objetivo: linea, porcentaje: 12.5, exclusiones: [blancos] }],
      exclusiones: [blancos],
      fechaCreacion: '2026-11-01T00:00:00.000Z',
      fechaActualizacion: '2026-11-01T00:00:00.000Z',
      actualizadoPor: null,
    };
    const r = aCuerpoEvento(borradorDesdeEvento(evento));
    expect(r).toMatchObject({
      ok: true,
      valor: {
        descripcion: 'Semanal',
        calendario: { fechaFin: '2026-12-30' },
        reglas: [{ porcentaje: 12.5, exclusiones: [{ tipo: 'familia_color', id: 1 }] }],
      },
    });
  });
});

describe('formulario de cupón', () => {
  const relleno = {
    ...cuponVacio(),
    codigo: 'bienvenida10',
    nombre: 'Bienvenida',
    valor: '10',
    fechaInicio: '2026-11-01T08:00',
  };

  it('porcentaje: arma el cuerpo y deja sin límite lo que se dejó vacío', () => {
    const r = aCuerpoCupon(relleno, 'crear');
    expect(r).toMatchObject({
      ok: true,
      valor: {
        codigo: 'BIENVENIDA10',
        valor: 10,
        montoMinimoCompra: null,
        usosMaximos: null,
        usosPorUsuario: null,
        fechaInicio: '2026-11-01T13:00:00.000Z',
        fechaFin: null,
      },
    });
  });

  it('importe fijo con límites', () => {
    const r = aCuerpoCupon(
      {
        ...relleno,
        tipoValor: 'importe_fijo',
        valor: '5.000',
        montoMinimoCompra: '50.000',
        usosMaximos: '100',
        usosPorUsuario: '1',
        fechaFin: '2026-12-01T08:00',
      },
      'crear',
    );
    expect(r).toMatchObject({
      ok: true,
      valor: { valor: 5000, montoMinimoCompra: 50000, usosMaximos: 100, usosPorUsuario: 1 },
    });
  });

  it('editar no envía el código', () => {
    const r = aCuerpoCupon(relleno, 'editar');
    expect(r.ok && 'codigo' in r.valor).toBe(false);
  });

  it.each([
    ['porcentaje sin valor', { valor: '' }],
    ['porcentaje de más de 100', { valor: '150' }],
    ['mínimo inválido', { montoMinimoCompra: 'mucho' }],
    ['usos con decimales', { usosMaximos: '2,5' }],
    ['sin fecha de inicio', { fechaInicio: '' }],
    ['fin antes del inicio', { fechaFin: '2026-10-01T08:00' }],
    ['código corto', { codigo: 'abc' }],
  ])('rechaza: %s', (_n, sobre) => {
    expect(aCuerpoCupon({ ...relleno, ...sobre }, 'crear').ok).toBe(false);
  });
});

describe('formulario de tipo de cliente empresa', () => {
  it('Proveedor 15 % con mínimo; el mínimo y el tope vacíos son 0', () => {
    expect(
      aCuerpoTipoCliente({ nombre: 'Proveedor', porcentaje: '15', montoMinimoCompra: '300.000', tope: '' }),
    ).toEqual({
      ok: true,
      valor: { nombre: 'Proveedor', porcentaje: 15, montoMinimoCompra: 300000, tope: 0 },
    });
    expect(aCuerpoTipoCliente({ ...tipoClienteVacio(), nombre: 'Constructora', porcentaje: '10' })).toMatchObject({
      ok: true,
      valor: { montoMinimoCompra: 0, tope: 0 },
    });
  });

  it.each([
    ['sin porcentaje', { porcentaje: '' }],
    ['porcentaje 0', { porcentaje: '0' }],
    ['mínimo inválido', { montoMinimoCompra: 'x' }],
    ['nombre corto', { nombre: 'ab' }],
  ])('rechaza: %s', (_n, sobre) => {
    expect(
      aCuerpoTipoCliente({ nombre: 'Proveedor', porcentaje: '15', montoMinimoCompra: '', tope: '', ...sobre }).ok,
    ).toBe(false);
  });
});
