import { describe, expect, it } from 'vitest';
import {
  calcularDiasHabiles,
  calcularDiasCalendario,
  validarElegibilidadCancelacion,
  validarElegibilidadDevolucion,
  validarTransicionPostventa,
  ErrorPostventa,
} from '../services/reglas-postventa';

describe('M11 Reglas de Dominio de Postventa', () => {
  describe('Cálculo de días hábiles y calendario', () => {
    it('calcula días hábiles omitiendo fines de semana', () => {
      // Viernes 2026-10-23 a Lunes 2026-10-26 = 1 día hábil transcurrido
      const viernes = new Date('2026-10-23T10:00:00Z');
      const lunes = new Date('2026-10-26T10:00:00Z');
      expect(calcularDiasHabiles(viernes, lunes)).toBe(1);
    });

    it('calcula días calendario correctamente', () => {
      const d1 = new Date('2026-10-01T00:00:00Z');
      const d2 = new Date('2026-10-15T00:00:00Z');
      expect(calcularDiasCalendario(d1, d2)).toBe(14);
    });
  });

  describe('Elegibilidad de Cancelación (HU-POS-01 / RN-POS-01)', () => {
    it('permite cancelar en estados orden_confirmada, revision_disponibilidad y en_preparacion', () => {
      expect(() => validarElegibilidadCancelacion('orden_confirmada')).not.toThrow();
      expect(() => validarElegibilidadCancelacion('revision_disponibilidad')).not.toThrow();
      expect(() => validarElegibilidadCancelacion('en_preparacion')).not.toThrow();
    });

    it('rechaza cancelar si la orden ya está preparada o despachada', () => {
      expect(() => validarElegibilidadCancelacion('preparada')).toThrowError(ErrorPostventa);
      expect(() => validarElegibilidadCancelacion('despachado')).toThrowError(ErrorPostventa);
      expect(() => validarElegibilidadCancelacion('entregado')).toThrowError(ErrorPostventa);
    });
  });

  describe('Elegibilidad de Devolución por Retracto y Garantía (HU-POS-02 / RN-POS-02, 03, 04)', () => {
    const lineasBase = [
      {
        idLineaOrden: 1,
        cantidad: 3,
        esEntonado: false,
        nombreProducto: 'Viniltex Blanco Galón',
      },
      {
        idLineaOrden: 2,
        cantidad: 1,
        esEntonado: true,
        nombreProducto: 'Color Entonado Coral Deep',
      },
    ];

    it('permite devolución por retracto de producto estándar dentro de 5 días hábiles', () => {
      const fechaOrden = new Date('2026-10-20T10:00:00Z');
      const ahora = new Date('2026-10-23T10:00:00Z'); // 3 días hábiles
      expect(() =>
        validarElegibilidadDevolucion(
          'devolucion',
          'entregado',
          fechaOrden,
          [{ idLineaOrden: 1, cantidad: 2 }],
          lineasBase,
          ahora
        )
      ).not.toThrow();
    });

    it('rechaza devolución por retracto si supera los 5 días hábiles (Ley 1480)', () => {
      const fechaOrden = new Date('2026-10-01T10:00:00Z');
      const ahora = new Date('2026-10-15T10:00:00Z'); // 10 días hábiles
      expect(() =>
        validarElegibilidadDevolucion(
          'devolucion',
          'entregado',
          fechaOrden,
          [{ idLineaOrden: 1, cantidad: 1 }],
          lineasBase,
          ahora
        )
      ).toThrowError(/5 días hábiles/);
    });

    it('rechaza estrictamente la devolución por retracto de colores entonados (RF-POS-04-04)', () => {
      const fechaOrden = new Date('2026-10-23T10:00:00Z');
      const ahora = new Date('2026-10-24T10:00:00Z');
      expect(() =>
        validarElegibilidadDevolucion(
          'devolucion',
          'entregado',
          fechaOrden,
          [{ idLineaOrden: 2, cantidad: 1 }],
          lineasBase,
          ahora
        )
      ).toThrowError(/entonado/);
    });

    it('rechaza si la cantidad a devolver supera la cantidad comprada', () => {
      const fechaOrden = new Date('2026-10-23T10:00:00Z');
      const ahora = new Date('2026-10-24T10:00:00Z');
      expect(() =>
        validarElegibilidadDevolucion(
          'devolucion',
          'entregado',
          fechaOrden,
          [{ idLineaOrden: 1, cantidad: 5 }], // compró 3
          lineasBase,
          ahora
        )
      ).toThrowError(/supera la cantidad comprada/);
    });

    it('permite reclamación por garantía dentro de 30 días calendario incluso para entonados si hubo falla', () => {
      const fechaOrden = new Date('2026-10-10T10:00:00Z');
      const ahora = new Date('2026-10-25T10:00:00Z'); // 15 días calendario
      expect(() =>
        validarElegibilidadDevolucion(
          'garantia',
          'entregado',
          fechaOrden,
          [{ idLineaOrden: 2, cantidad: 1 }],
          lineasBase,
          ahora
        )
      ).not.toThrow();
    });
  });

  describe('Unidades ya devueltas (RN-POS-05)', () => {
    const lineas = [{ idLineaOrden: 1, cantidad: 3, esEntonado: false, nombreProducto: 'Viniltex Blanco Galón' }];
    const entrega = new Date('2026-10-20T10:00:00Z');
    const ahora = new Date('2026-10-21T10:00:00Z');

    it('descuenta lo que otras solicitudes ya devolvieron', () => {
      const yaDevueltas = new Map([[1, 2]]);
      expect(() =>
        validarElegibilidadDevolucion('devolucion', 'entregado', entrega, [{ idLineaOrden: 1, cantidad: 1 }], lineas, ahora, yaDevueltas)
      ).not.toThrow();
      expect(() =>
        validarElegibilidadDevolucion('devolucion', 'entregado', entrega, [{ idLineaOrden: 1, cantidad: 2 }], lineas, ahora, yaDevueltas)
      ).toThrowError(/ya devolviste 2/);
    });

    it('suma la misma línea si viene repetida en la solicitud', () => {
      expect(() =>
        validarElegibilidadDevolucion(
          'devolucion',
          'entregado',
          entrega,
          [
            { idLineaOrden: 1, cantidad: 2 },
            { idLineaOrden: 1, cantidad: 2 },
          ],
          lineas,
          ahora
        )
      ).toThrowError(/supera la cantidad comprada/);
    });
  });

  describe('Máquina de Estados de Postventa', () => {
    it('permite transicionar de solicitada a aprobada o rechazada', () => {
      expect(() => validarTransicionPostventa('solicitada', 'aprobada')).not.toThrow();
      expect(() => validarTransicionPostventa('solicitada', 'rechazada')).not.toThrow();
      expect(() => validarTransicionPostventa('solicitada', 'en_revision')).not.toThrow();
    });

    it('permite transicionar de aprobada a reembolsada', () => {
      expect(() => validarTransicionPostventa('aprobada', 'reembolsada')).not.toThrow();
    });

    it('rechaza transicionar directamente de solicitada a reembolsada sin aprobar', () => {
      expect(() => validarTransicionPostventa('solicitada', 'reembolsada')).toThrowError(
        ErrorPostventa
      );
    });

    it('rechaza cualquier cambio desde estados terminales (rechazada, reembolsada)', () => {
      expect(() => validarTransicionPostventa('rechazada', 'aprobada')).toThrowError(
        ErrorPostventa
      );
      expect(() => validarTransicionPostventa('reembolsada', 'solicitada')).toThrowError(
        ErrorPostventa
      );
    });
  });
});
