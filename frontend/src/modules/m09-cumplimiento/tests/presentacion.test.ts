import { describe, expect, it } from 'vitest';
import { ESTADOS_LINEA } from '../dtos/m09-cumplimiento.dto';
import {
  AVISO_PASO_AUTOMATICO,
  avisoDelEstado,
  ETIQUETA_ESTADO_LINEA,
  MARCAS,
  resumenAvance,
  varianteLinea,
} from '../services/presentacion';
import { lineaVerificacion, verificacion } from './fixtures';

describe('presentación de M09', () => {
  it('toda línea tiene una etiqueta legible y una variante, y las tres marcas se ofrecen en orden', () => {
    for (const estado of ESTADOS_LINEA) {
      expect(ETIQUETA_ESTADO_LINEA[estado].length).toBeGreaterThan(0);
      expect(varianteLinea(estado)).toBeTruthy();
    }
    expect(MARCAS.map((m) => m.valor)).toEqual(['disponible', 'consiguiendo_stock', 'no_disponible']);
  });

  it('«sin revisar» no es una marca que se pueda elegir', () => {
    expect(MARCAS.map((m) => m.valor)).not.toContain('pendiente');
  });

  it('cada estado de línea se distingue por algo más que el color: tiene su propio texto', () => {
    const textos = ESTADOS_LINEA.map((e) => ETIQUETA_ESTADO_LINEA[e]);
    expect(new Set(textos).size).toBe(ESTADOS_LINEA.length);
    expect(varianteLinea('disponible')).toBe('success');
    expect(varianteLinea('consiguiendo_stock')).toBe('sponsored');
    expect(varianteLinea('no_disponible')).toBe('danger');
    expect(varianteLinea('pendiente')).toBe('neutral');
  });

  it('resume el avance con singular y plural', () => {
    const dos = [lineaVerificacion({ estado: 'disponible' }), lineaVerificacion({ numeroLinea: 2 })];
    expect(resumenAvance(verificacion(dos))).toBe('1 de 2 productos disponibles');
    expect(resumenAvance(verificacion([lineaVerificacion({ estado: 'disponible' })]))).toBe('1 de 1 producto disponible');
    expect(resumenAvance(verificacion([lineaVerificacion()]))).toBe('0 de 1 producto disponible');
  });

  it('en revisión explica el paso automático; después avisa que corregir no devuelve el pedido', () => {
    expect(avisoDelEstado('revision_disponibilidad')).toBe(AVISO_PASO_AUTOMATICO);
    expect(avisoDelEstado('en_preparacion')).toContain('no vuelve atrás');
    expect(avisoDelEstado('preparada')).toContain('no vuelve atrás');
  });

  it('los textos de la interfaz no mencionan códigos de historia, reglas ni el contrato', () => {
    const todos = [...Object.values(ETIQUETA_ESTADO_LINEA), ...MARCAS.map((m) => m.etiqueta), AVISO_PASO_AUTOMATICO, avisoDelEstado('preparada')];
    for (const texto of todos) expect(texto).not.toMatch(/HU-|RF-|R\d|contrato|M09/);
  });
});
