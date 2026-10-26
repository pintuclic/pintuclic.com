import { describe, expect, it } from 'vitest';
import { aBogota } from '../services/fechas';
import { mejorOferta, situacionEvento, type ClasificacionLinea, type EventoMotor } from '../services/motor-eventos';

/** Miércoles 4 de noviembre de 2026, 10:00 en Bogotá = 15:00 UTC. */
const MIERCOLES_10AM = new Date('2026-11-04T15:00:00Z');

const miercolesDeColor: EventoMotor = {
  idEvento: 1,
  nombre: 'Miércoles de color',
  estado: 'activo',
  calendario: { fechaInicio: '2026-11-01', fechaFin: null, diasSemana: [3], horaInicio: null, horaFin: null },
  reglas: [
    { idRegla: 1, objetivo: { tipo: 'linea', id: 1 }, porcentaje: 15, exclusiones: [{ tipo: 'producto', id: 99 }] },
    { idRegla: 2, objetivo: { tipo: 'linea', id: 2 }, porcentaje: 10, exclusiones: [{ tipo: 'color', id: 77 }] },
  ],
  exclusiones: [{ tipo: 'familia_color', id: 1 }],
};

const viniltex: ClasificacionLinea = {
  idVariante: 10,
  idProducto: 5,
  idMarca: 1,
  idLinea: 1,
  idSubcategoria: 3,
  idCategoria: 2,
  idColor: null,
  idFamiliaColor: null,
};

describe('fechas · hora de Colombia', () => {
  it('convierte UTC a Bogotá (UTC-5) y calcula el día ISO', () => {
    expect(aBogota(MIERCOLES_10AM)).toEqual({ fecha: '2026-11-04', hora: '10:00', diaSemana: 3 });
  });
  it('las 03:00 UTC del miércoles siguen siendo martes por la noche en Colombia', () => {
    expect(aBogota(new Date('2026-11-04T03:00:00Z'))).toEqual({ fecha: '2026-11-03', hora: '22:00', diaSemana: 2 });
  });
  it('el domingo es 7', () => {
    expect(aBogota(new Date('2026-11-08T15:00:00Z')).diaSemana).toBe(7);
  });
});

describe('situacionEvento (R4)', () => {
  it('todos los miércoles: en curso el miércoles y en espera el jueves', () => {
    expect(situacionEvento(miercolesDeColor, MIERCOLES_10AM)).toBe('en_curso');
    expect(situacionEvento(miercolesDeColor, new Date('2026-11-05T15:00:00Z'))).toBe('en_espera');
  });
  it('programado antes de su fecha de inicio y vencido después de la de fin', () => {
    expect(situacionEvento(miercolesDeColor, new Date('2026-10-28T15:00:00Z'))).toBe('programado');
    const acotado = { ...miercolesDeColor, calendario: { ...miercolesDeColor.calendario, fechaFin: '2026-11-10' } };
    expect(situacionEvento(acotado, new Date('2026-11-11T15:00:00Z'))).toBe('vencido');
    expect(situacionEvento(acotado, new Date('2026-11-10T15:00:00Z'))).toBe('en_espera');
  });
  it('el día de fin es inclusivo', () => {
    const unDia = {
      ...miercolesDeColor,
      calendario: {
        fechaInicio: '2026-11-04',
        fechaFin: '2026-11-04',
        diasSemana: [],
        horaInicio: null,
        horaFin: null,
      },
    };
    expect(situacionEvento(unDia, new Date('2026-11-05T04:59:00Z'))).toBe('en_curso');
    expect(situacionEvento(unDia, new Date('2026-11-05T05:00:00Z'))).toBe('vencido');
  });
  it('con horas: dentro de [inicio, fin) está en curso; la hora de fin ya no', () => {
    const conHoras = {
      ...miercolesDeColor,
      calendario: { ...miercolesDeColor.calendario, horaInicio: '08:00', horaFin: '20:00' },
    };
    expect(situacionEvento(conHoras, new Date('2026-11-04T13:00:00Z'))).toBe('en_curso'); // 08:00
    expect(situacionEvento(conHoras, new Date('2026-11-04T12:59:00Z'))).toBe('en_espera'); // 07:59
    expect(situacionEvento(conHoras, new Date('2026-11-05T01:00:00Z'))).toBe('en_espera'); // 20:00
  });
  it('un evento inactivo nunca está en curso', () => {
    expect(situacionEvento({ ...miercolesDeColor, estado: 'inactivo' }, MIERCOLES_10AM)).toBe('inactivo');
  });
});

describe('mejorOferta (R5–R8)', () => {
  it('descuenta por línea comercial con su propio porcentaje', () => {
    expect(mejorOferta([miercolesDeColor], viniltex, MIERCOLES_10AM)?.porcentaje).toBe(15);
    const koraza = { ...viniltex, idLinea: 2 };
    expect(mejorOferta([miercolesDeColor], koraza, MIERCOLES_10AM)?.porcentaje).toBe(10);
  });
  it('una línea fuera de las reglas no recibe nada', () => {
    expect(mejorOferta([miercolesDeColor], { ...viniltex, idLinea: 3 }, MIERCOLES_10AM)).toBeNull();
    expect(mejorOferta([miercolesDeColor], { ...viniltex, idLinea: null }, MIERCOLES_10AM)).toBeNull();
  });
  it('fuera del día del evento no hay oferta', () => {
    expect(mejorOferta([miercolesDeColor], viniltex, new Date('2026-11-05T15:00:00Z'))).toBeNull();
  });
  it('"toda la línea menos este producto"', () => {
    expect(mejorOferta([miercolesDeColor], { ...viniltex, idProducto: 99 }, MIERCOLES_10AM)).toBeNull();
  });
  it('"toda la línea menos este color": solo cuando se conoce el color elegido (R8)', () => {
    const koraza = { ...viniltex, idLinea: 2 };
    expect(mejorOferta([miercolesDeColor], { ...koraza, idColor: 77 }, MIERCOLES_10AM)).toBeNull();
    expect(mejorOferta([miercolesDeColor], { ...koraza, idColor: 78 }, MIERCOLES_10AM)?.porcentaje).toBe(10);
    // sin color elegido (tarjeta, listado) se ignora la excepción
    expect(mejorOferta([miercolesDeColor], koraza, MIERCOLES_10AM)?.porcentaje).toBe(10);
  });
  it('el blanco (familia de color) queda fuera de todo el evento; el color de otra línea no se ve afectado', () => {
    expect(mejorOferta([miercolesDeColor], { ...viniltex, idColor: 5, idFamiliaColor: 1 }, MIERCOLES_10AM)).toBeNull();
    expect(
      mejorOferta([miercolesDeColor], { ...viniltex, idColor: 5, idFamiliaColor: 7 }, MIERCOLES_10AM)?.porcentaje,
    ).toBe(15);
    // el color 77 solo se excluye en la regla de Koraza, no en la de Viniltex
    expect(
      mejorOferta([miercolesDeColor], { ...viniltex, idColor: 77, idFamiliaColor: 7 }, MIERCOLES_10AM)?.porcentaje,
    ).toBe(15);
  });
  it('objetivo null cubre todo el catálogo', () => {
    const todo: EventoMotor = {
      ...miercolesDeColor,
      idEvento: 2,
      exclusiones: [],
      reglas: [{ idRegla: 9, objetivo: null, porcentaje: 5, exclusiones: [] }],
    };
    expect(mejorOferta([todo], { ...viniltex, idLinea: null }, MIERCOLES_10AM)?.porcentaje).toBe(5);
  });
  it('las ofertas no se suman: gana el mayor porcentaje (empate: menor evento, luego menor regla)', () => {
    const otro: EventoMotor = {
      ...miercolesDeColor,
      idEvento: 2,
      nombre: 'Marca Pintuco',
      exclusiones: [],
      reglas: [{ idRegla: 5, objetivo: { tipo: 'marca', id: 1 }, porcentaje: 20, exclusiones: [] }],
    };
    expect(mejorOferta([miercolesDeColor, otro], viniltex, MIERCOLES_10AM)).toMatchObject({
      idEvento: 2,
      porcentaje: 20,
    });
    const empate: EventoMotor = {
      ...otro,
      idEvento: 3,
      reglas: [{ idRegla: 6, objetivo: { tipo: 'marca', id: 1 }, porcentaje: 15, exclusiones: [] }],
    };
    expect(mejorOferta([empate, miercolesDeColor], viniltex, MIERCOLES_10AM)).toMatchObject({ idEvento: 1 });
  });
  it('objetivos por variante, producto, subcategoría y categoría', () => {
    const casos = [
      { tipo: 'variante', id: 10 },
      { tipo: 'producto', id: 5 },
      { tipo: 'subcategoria', id: 3 },
      { tipo: 'categoria', id: 2 },
    ] as const;
    for (const objetivo of casos) {
      const ev: EventoMotor = {
        ...miercolesDeColor,
        exclusiones: [],
        reglas: [{ idRegla: 1, objetivo, porcentaje: 8, exclusiones: [] }],
      };
      expect(mejorOferta([ev], viniltex, MIERCOLES_10AM)?.porcentaje).toBe(8);
      expect(
        mejorOferta(
          [ev],
          { ...viniltex, idVariante: 11, idProducto: 6, idSubcategoria: 4, idCategoria: 3 },
          MIERCOLES_10AM,
        ),
      ).toBeNull();
    }
  });
});
