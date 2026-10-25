import { describe, expect, it } from 'vitest';
import { ESTADOS_ORDEN } from '../dtos/m08-ordenes.dto';
import {
  desgloseTotales,
  ETIQUETA_ESTADO,
  formatearDuracion,
  formatearFecha,
  formatearFechaHora,
  varianteEstado,
} from '../services/presentacion';

describe('presentación de la orden (HU-ORD-03, HU-ORD-07)', () => {
  it('todo estado del contrato tiene etiqueta en español', () => {
    for (const estado of ESTADOS_ORDEN) {
      expect(ETIQUETA_ESTADO[estado]).toBeTruthy();
    }
    expect(ETIQUETA_ESTADO.despachado).toBe('Enviado');
  });

  it('el color del estado distingue en curso, cierre normal y cancelación', () => {
    expect(varianteEstado('en_preparacion')).toBe('action');
    expect(varianteEstado('despachado')).toBe('success');
    expect(varianteEstado('entregado')).toBe('success');
    expect(varianteEstado('cancelado')).toBe('danger');
    expect(varianteEstado('devuelto')).toBe('neutral');
  });

  it('la fecha de la orden se muestra como día, sin que la zona horaria la corra', () => {
    expect(formatearFecha('2026-05-12T00:00:00.000Z')).toBe('12 de mayo de 2026');
  });

  it('el momento de un cambio se muestra en hora de Colombia', () => {
    expect(formatearFechaHora('2026-05-12T20:30:00.000Z')).toContain('3:30');
  });

  describe('desglose de totales (los precios incluyen IVA)', () => {
    const sinEspacios = (texto: string) => texto.replace(/\s/g, ' ');

    it('el IVA no es un sumando: va en una nota y el total no cambia (PC-2026-00001)', () => {
      const d = desgloseTotales({
        subTotal: 171800,
        descuento: 0,
        costoEntrega: 0,
        baseSinImpuesto: 144369.75,
        importeIva: 27430.25,
        tasaIva: 19,
        total: 171800,
      });

      expect(d.filas.map((f) => f.etiqueta)).toEqual(['Subtotal']);
      expect(sinEspacios(d.total)).toBe('$ 171.800');
      expect(sinEspacios(d.ivaIncluido ?? '')).toBe('Incluye IVA (19 %): $ 27.430 · Base sin IVA: $ 144.370');
    });

    it('con descuentos y envío: subtotal − descuentos + envío = total', () => {
      const d = desgloseTotales({
        subTotal: 500000,
        descuento: 75000,
        costoEntrega: 10000,
        baseSinImpuesto: 357142.86,
        importeIva: 67857.14,
        tasaIva: 19,
        total: 435000,
      });

      expect(d.filas.map((f) => f.etiqueta)).toEqual(['Subtotal', 'Descuentos', 'Envío']);
      expect(sinEspacios(d.filas[1]?.valor ?? '')).toBe('−$ 75.000');
    });

    it('una orden anterior sin IVA congelado no inventa la nota', () => {
      const d = desgloseTotales({
        subTotal: 1000,
        descuento: 0,
        costoEntrega: 0,
        baseSinImpuesto: null,
        importeIva: null,
        tasaIva: null,
        total: 1000,
      });

      expect(d.ivaIncluido).toBeNull();
    });
  });

  it.each([
    [0, 'menos de 1 min'],
    [59, 'menos de 1 min'],
    [12 * 60, '12 min'],
    [5 * 3600, '5 h'],
    [3 * 86400 + 2 * 3600, '3 d 2 h'],
    [2 * 86400, '2 d'],
  ])('%i s → %s', (segundos, esperado) => {
    expect(formatearDuracion(segundos)).toBe(esperado);
  });
});
