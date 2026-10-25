import { describe, expect, it } from 'vitest';
import type { FranjaHorario } from '../dtos/m15-atencion.dto';
import { estaAbierto, momentoEnColombia } from '../services/horario';

/** Semana del seed: lunes a viernes 08:00-18:00, sábado 08:00-13:00, domingo cerrado. */
const SEMANA: FranjaHorario[] = [
  { diaSemana: 'lunes', abierto: true, horaInicio: '08:00', horaFin: '18:00' },
  { diaSemana: 'martes', abierto: true, horaInicio: '08:00', horaFin: '18:00' },
  { diaSemana: 'miercoles', abierto: true, horaInicio: '08:00', horaFin: '18:00' },
  { diaSemana: 'jueves', abierto: true, horaInicio: '08:00', horaFin: '18:00' },
  { diaSemana: 'viernes', abierto: true, horaInicio: '08:00', horaFin: '18:00' },
  { diaSemana: 'sabado', abierto: true, horaInicio: '08:00', horaFin: '13:00' },
  { diaSemana: 'domingo', abierto: false, horaInicio: null, horaFin: null },
];

// 2026-10-26 es lunes. Colombia es UTC-5 todo el año (sin horario de verano).
const LUNES_08_00 = new Date('2026-10-26T13:00:00Z');
const LUNES_07_59 = new Date('2026-10-26T12:59:00Z');
const LUNES_17_59 = new Date('2026-10-26T22:59:00Z');
const LUNES_18_00 = new Date('2026-10-26T23:00:00Z');
const LUNES_21_00_UTC_YA_ES_MARTES = new Date('2026-10-27T02:00:00Z');
const DOMINGO_10_00 = new Date('2026-11-01T15:00:00Z');
const SABADO_12_59 = new Date('2026-10-31T17:59:00Z');
const SABADO_13_00 = new Date('2026-10-31T18:00:00Z');

describe('momentoEnColombia — la hora se resuelve en America/Bogota (HU-ATC-04)', () => {
  it('traduce el instante UTC a la hora local de Colombia', () => {
    expect(momentoEnColombia(LUNES_08_00)).toEqual({ dia: 'lunes', hora: '08:00' });
  });

  it('a las 02:00 UTC del martes en Colombia siguen siendo las 21:00 del lunes', () => {
    // Es la prueba de que no se usa la fecha del servidor: en UTC ya es martes.
    expect(momentoEnColombia(LUNES_21_00_UTC_YA_ES_MARTES)).toEqual({ dia: 'lunes', hora: '21:00' });
  });

  it('resuelve el domingo correctamente', () => {
    expect(momentoEnColombia(DOMINGO_10_00)).toEqual({ dia: 'domingo', hora: '10:00' });
  });
});

describe('estaAbierto — atención humana vigente (RF-ATC-04-01)', () => {
  it('abre justo en la hora de inicio', () => {
    expect(estaAbierto(SEMANA, LUNES_08_00)).toBe(true);
  });

  it('un minuto antes de abrir está cerrado', () => {
    expect(estaAbierto(SEMANA, LUNES_07_59)).toBe(false);
  });

  it('un minuto antes de cerrar sigue abierto', () => {
    expect(estaAbierto(SEMANA, LUNES_17_59)).toBe(true);
  });

  it('en la hora de cierre ya está cerrado', () => {
    expect(estaAbierto(SEMANA, LUNES_18_00)).toBe(false);
  });

  it('un día marcado como cerrado lo está a cualquier hora', () => {
    expect(estaAbierto(SEMANA, DOMINGO_10_00)).toBe(false);
  });

  it('respeta la franja más corta del sábado', () => {
    expect(estaAbierto(SEMANA, SABADO_12_59)).toBe(true);
    expect(estaAbierto(SEMANA, SABADO_13_00)).toBe(false);
  });

  it('sin la franja del día responde cerrado en vez de fallar', () => {
    const sinLunes = SEMANA.filter((franja) => franja.diaSemana !== 'lunes');

    expect(estaAbierto(sinLunes, LUNES_08_00)).toBe(false);
  });

  it('un día abierto sin horas registradas se trata como cerrado', () => {
    const incoherente: FranjaHorario[] = [
      { diaSemana: 'lunes', abierto: true, horaInicio: null, horaFin: null },
    ];

    expect(estaAbierto(incoherente, LUNES_08_00)).toBe(false);
  });
});
