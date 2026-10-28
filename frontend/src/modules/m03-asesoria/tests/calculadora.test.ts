import { describe, expect, it } from 'vitest';
import {
  areaCampoSchema,
  formularioCantidadSchema,
  formularioCoberturaSchema,
  manosCampoSchema,
  numeroDeCampo,
  unidadesCampoSchema,
} from '../dtos/m03-asesoria.dto';
import { formatearIntervalo, unidadesDe } from '../services/mensaje-error';

/** El primer mensaje de error, que es el que muestra el campo. */
function mensaje(resultado: { success: boolean; error?: { issues: Array<{ message: string }> } }): string {
  return resultado.error?.issues[0]?.message ?? '';
}

describe('Formulario de la calculadora (M03 · K8)', () => {
  describe('área a pintar', () => {
    it('acepta un número con hasta dos decimales, con punto o con coma', () => {
      for (const entrada of ['50', '50.5', '12,25', '0.01']) {
        expect(areaCampoSchema.safeParse(entrada).success).toBe(true);
      }
    });

    it('CA-ASE-02-08: rechaza el vacío diciendo qué falta', () => {
      const resultado = areaCampoSchema.safeParse('');
      expect(resultado.success).toBe(false);
      expect(mensaje(resultado)).toBe('Indica el área a pintar en metros cuadrados');
    });

    it('CA-ASE-02-08: rechaza el cero y los negativos', () => {
      expect(mensaje(areaCampoSchema.safeParse('0'))).toBe('El área debe ser mayor que cero');
      // Un signo menos no es un número válido en el campo.
      expect(areaCampoSchema.safeParse('-5').success).toBe(false);
    });

    it('rechaza texto que no es un número', () => {
      expect(mensaje(areaCampoSchema.safeParse('mucho'))).toBe('Escribe el área en números');
    });

    it('rechaza más de dos decimales', () => {
      expect(mensaje(areaCampoSchema.safeParse('50.123'))).toBe('Usa como máximo dos decimales');
    });

    it('rechaza un área desproporcionada', () => {
      expect(areaCampoSchema.safeParse('100001').success).toBe(false);
    });
  });

  describe('número de manos', () => {
    it('CA-ASE-02-06: sin manos el formulario lo exige, no supone ninguna', () => {
      const resultado = manosCampoSchema.safeParse('');
      expect(resultado.success).toBe(false);
      expect(mensaje(resultado)).toBe('Indica cuántas manos vas a dar');
    });

    it('CA-ASE-02-08: rechaza el cero y los decimales', () => {
      expect(mensaje(manosCampoSchema.safeParse('0'))).toBe('Indica al menos una mano');
      expect(mensaje(manosCampoSchema.safeParse('1.5'))).toBe('Las manos deben ser un número entero');
    });

    it('acepta de 1 a 10 manos', () => {
      expect(manosCampoSchema.safeParse('1').success).toBe(true);
      expect(manosCampoSchema.safeParse('10').success).toBe(true);
      expect(manosCampoSchema.safeParse('11').success).toBe(false);
    });
  });

  describe('unidades que ya se tienen', () => {
    it('exige el dato y rechaza lo que no es un entero positivo', () => {
      expect(mensaje(unidadesCampoSchema.safeParse(''))).toBe('Indica cuántas unidades tienes');
      expect(unidadesCampoSchema.safeParse('0').success).toBe(false);
      expect(unidadesCampoSchema.safeParse('2.5').success).toBe(false);
      expect(unidadesCampoSchema.safeParse('2').success).toBe(true);
    });
  });

  describe('formularios completos', () => {
    it('cuánto comprar: pide presentación, área y manos', () => {
      expect(
        formularioCantidadSchema.safeParse({ idVariante: '10', area: '50', manos: '2' }).success,
      ).toBe(true);
      expect(
        formularioCantidadSchema.safeParse({ idVariante: '', area: '50', manos: '2' }).success,
      ).toBe(false);
    });

    it('cuánto rinde: pide presentación, unidades y manos', () => {
      expect(
        formularioCoberturaSchema.safeParse({ idVariante: '10', unidades: '2', manos: '2' }).success,
      ).toBe(true);
      expect(
        formularioCoberturaSchema.safeParse({ idVariante: '10', unidades: '2', manos: '' }).success,
      ).toBe(false);
    });
  });

  describe('conversión del campo al número que espera la API', () => {
    it('entiende la coma decimal que escribe la gente', () => {
      expect(numeroDeCampo('12,5')).toBe(12.5);
      expect(numeroDeCampo('50')).toBe(50);
    });
  });
});

describe('Texto del resultado', () => {
  it('muestra una sola cifra cuando el rendimiento es un valor único', () => {
    expect(formatearIntervalo(4, 4, 'unidades')).toBe('4 unidades');
  });

  it('muestra un intervalo cuando el rendimiento es un rango (RF-ASE-02-03)', () => {
    expect(formatearIntervalo(6, 8, 'unidades')).toBe('entre 6 y 8 unidades');
  });

  it('conserva el decimal de la cobertura', () => {
    expect(formatearIntervalo(6.6, 6.6, 'm²')).toBe('6,6 m²');
  });

  it('dice «1 unidad» y no «1 unidades»', () => {
    expect(unidadesDe(1, 1)).toBe('unidad');
    expect(formatearIntervalo(1, 1, unidadesDe(1, 1))).toBe('1 unidad');
  });

  it('un intervalo que empieza en uno ya es plural', () => {
    expect(unidadesDe(1, 2)).toBe('unidades');
    expect(unidadesDe(4, 5)).toBe('unidades');
  });
});
