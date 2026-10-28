import { describe, expect, it } from 'vitest';
import { etiquetaOferta, ofertaDePresentacion, precioVisible } from '../services/ofertas-visuales';

const oferta = { nombre: 'Miércoles de color', porcentaje: 15, precioAntes: 100000, precioConOferta: 85000 };

describe('M01 · ofertas en tarjetas y ficha', () => {
  it('rotula el porcentaje con el menos tipográfico y coma decimal', () => {
    expect(etiquetaOferta(15)).toBe('−15 %');
    expect(etiquetaOferta(12.5)).toBe('−12,5 %');
  });

  it('sin oferta muestra solo el precio, sin tachado ni etiqueta', () => {
    expect(precioVisible(98900, null)).toEqual({ price: 98900, isOffer: false });
    expect(precioVisible(null, null)).toEqual({ price: 0, isOffer: false });
  });

  it('con oferta muestra el precio rebajado, el anterior tachado y el porcentaje', () => {
    expect(precioVisible(100000, oferta)).toEqual({
      price: 85000,
      originalPrice: 100000,
      isOffer: true,
      offerBadgeText: '−15 %',
    });
  });

  describe('oferta de una presentación al elegir color', () => {
    it('sin color elegido usa la oferta de la ficha', () => {
      expect(ofertaDePresentacion(1, oferta, null)).toBe(oferta);
    });

    it('con color manda la respuesta del servidor; null = el color está excluido y no hay oferta', () => {
      const otra = { ...oferta, porcentaje: 10 };
      expect(ofertaDePresentacion(1, oferta, new Map([[1, otra]]))).toBe(otra);
      expect(ofertaDePresentacion(1, oferta, new Map([[1, null]]))).toBeNull();
    });

    it('una presentación que el servidor no mencionó conserva la de la ficha', () => {
      expect(ofertaDePresentacion(2, oferta, new Map([[1, null]]))).toBe(oferta);
    });
  });
});
