import { describe, expect, it } from 'vitest';
import {
  ETIQUETA_ESTADO_POSTVENTA,
  ETIQUETA_METODO_REEMBOLSO,
  ETIQUETA_MOTIVO_RECHAZO,
  ETIQUETA_TIPO_POSTVENTA,
  formatearFecha,
  formatearMoneda,
} from '../services/presentacion';
import {
  ESTADOS_POSTVENTA,
  METODOS_REEMBOLSO,
  MOTIVOS_RECHAZO_POSTVENTA,
  TIPOS_POSTVENTA,
} from '../dtos/m11-postventa.dto';

describe('Presentación M11 Postventa', () => {
  it('tiene etiquetas definidas para todos los estados de postventa', () => {
    for (const estado of ESTADOS_POSTVENTA) {
      expect(ETIQUETA_ESTADO_POSTVENTA[estado]).toBeDefined();
      expect(ETIQUETA_ESTADO_POSTVENTA[estado].length).toBeGreaterThan(0);
    }
  });

  it('tiene etiquetas definidas para todos los tipos de postventa', () => {
    for (const tipo of TIPOS_POSTVENTA) {
      expect(ETIQUETA_TIPO_POSTVENTA[tipo]).toBeDefined();
    }
  });

  it('tiene etiquetas definidas para todos los motivos de rechazo', () => {
    for (const motivo of MOTIVOS_RECHAZO_POSTVENTA) {
      expect(ETIQUETA_MOTIVO_RECHAZO[motivo]).toBeDefined();
    }
  });

  it('tiene etiquetas definidas para todos los métodos de reembolso', () => {
    for (const metodo of METODOS_REEMBOLSO) {
      expect(ETIQUETA_METODO_REEMBOLSO[metodo]).toBeDefined();
    }
  });

  it('formatea moneda en pesos colombianos COP sin decimales', () => {
    const formateado = formatearMoneda(150000);
    expect(formateado).toContain('150.000');
  });

  it('formatea fechas ISO correctamente', () => {
    const iso = '2026-10-28T14:30:00.000Z';
    const formateado = formatearFecha(iso);
    expect(formateado.length).toBeGreaterThan(5);
  });
});
