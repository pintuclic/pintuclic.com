import { describe, expect, it } from 'vitest';
import {
  SELECTOR_FOCALIZABLES,
  siguienteIndiceDeFoco,
} from '@/core/components/overlays/foco';

describe('siguienteIndiceDeFoco — contrato de la trampa de foco del Core Kit', () => {
  it('no propone destino cuando el contenedor no tiene elementos focalizables', () => {
    expect(siguienteIndiceDeFoco(0, -1, false)).toBe(-1);
    expect(siguienteIndiceDeFoco(0, -1, true)).toBe(-1);
  });

  it('entra por el primer elemento cuando el foco viene de fuera con Tab', () => {
    expect(siguienteIndiceDeFoco(4, -1, false)).toBe(0);
  });

  it('entra por el ultimo elemento cuando el foco viene de fuera con Shift+Tab', () => {
    expect(siguienteIndiceDeFoco(4, -1, true)).toBe(3);
  });

  // Este es el defecto que se corrige: antes Tab en el ultimo elemento salia
  // del modal hacia la pagina de detras en lugar de volver al primero.
  it('vuelve al primer elemento al pulsar Tab en el ultimo', () => {
    expect(siguienteIndiceDeFoco(3, 2, false)).toBe(0);
  });

  it('salta al ultimo elemento al pulsar Shift+Tab en el primero', () => {
    expect(siguienteIndiceDeFoco(3, 0, true)).toBe(2);
  });

  it('avanza y retrocede de uno en uno en el interior del recorrido', () => {
    expect(siguienteIndiceDeFoco(5, 2, false)).toBe(3);
    expect(siguienteIndiceDeFoco(5, 2, true)).toBe(1);
  });

  it('mantiene el foco en el unico elemento focalizable en ambos sentidos', () => {
    expect(siguienteIndiceDeFoco(1, 0, false)).toBe(0);
    expect(siguienteIndiceDeFoco(1, 0, true)).toBe(0);
  });
});

describe('SELECTOR_FOCALIZABLES', () => {
  it('excluye los elementos retirados del orden de tabulacion', () => {
    expect(SELECTOR_FOCALIZABLES).toContain('[tabindex]:not([tabindex="-1"])');
  });

  it('ignora los controles deshabilitados', () => {
    expect(SELECTOR_FOCALIZABLES).toContain('button:not([disabled])');
    expect(SELECTOR_FOCALIZABLES).toContain('input:not([disabled])');
  });

  it('incluye enlaces, selects y areas de texto', () => {
    expect(SELECTOR_FOCALIZABLES).toContain('a[href]');
    expect(SELECTOR_FOCALIZABLES).toContain('select:not([disabled])');
    expect(SELECTOR_FOCALIZABLES).toContain('textarea:not([disabled])');
  });
});
