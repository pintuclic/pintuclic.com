import { describe, expect, it } from 'vitest';
import {
  areaCampoSchema,
  areaDeMedidas,
  formularioCantidadSchema,
  formularioCoberturaSchema,
  formularioMedidasSchema,
  medidaCampoSchema,
  numeroDeCampo,
  repeticionesCampoSchema,
  unidadesCampoSchema,
} from '../dtos/m03-asesoria.dto';
import { formatearIntervalo, unidadesDe } from '../services/mensaje-error';
import { presentacionDeArranque } from '../services/presentaciones';
import { SUPERFICIES, superficiePorId } from '../services/superficies';
import type { CalculadoraProducto } from '../interfaces/asesoria.interface';

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

  describe('unidades que ya se tienen', () => {
    it('exige el dato y rechaza lo que no es un entero positivo', () => {
      expect(mensaje(unidadesCampoSchema.safeParse(''))).toBe('Indica cuántas unidades tienes');
      expect(unidadesCampoSchema.safeParse('0').success).toBe(false);
      expect(unidadesCampoSchema.safeParse('2.5').success).toBe(false);
      expect(unidadesCampoSchema.safeParse('2').success).toBe(true);
    });
  });

  describe('formularios completos', () => {
    it('cuánto comprar: pide presentación y área', () => {
      expect(formularioCantidadSchema.safeParse({ idVariante: '10', area: '50' }).success).toBe(
        true,
      );
      expect(formularioCantidadSchema.safeParse({ idVariante: '', area: '50' }).success).toBe(
        false,
      );
    });

    it('cuánto rinde: pide presentación y unidades', () => {
      expect(
        formularioCoberturaSchema.safeParse({ idVariante: '10', unidades: '2' }).success,
      ).toBe(true);
      expect(formularioCoberturaSchema.safeParse({ idVariante: '10', unidades: '' }).success).toBe(
        false,
      );
    });

    it('K9: las manos ya no son un campo del formulario', () => {
      // Decisión del Product Owner del 2026-10-27. Las resuelve el servidor, así que un
      // formulario sin ellas tiene que ser válido.
      expect(formularioCantidadSchema.safeParse({ idVariante: '10', area: '50' }).success).toBe(
        true,
      );
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

describe('Medidas de la superficie (mockup pág. 10)', () => {
  describe('área a partir de las medidas', () => {
    it('multiplica ancho por alto por la cantidad de piezas', () => {
      // El caso del mockup: 5,0 × 2,5 × 2 = 25 m².
      expect(areaDeMedidas('5.0', '2.5', '2')).toBe(25);
      expect(areaDeMedidas('3', '2', '1')).toBe(6);
    });

    it('entiende la coma decimal, igual que el resto del formulario', () => {
      expect(areaDeMedidas('5,0', '2,5', '2')).toBe(25);
    });

    it('no arrastra el error de la coma flotante', () => {
      // 1.1 * 2.2 en coma flotante da 2.4200000000000004: el servidor lo rechazaría
      // por tener más de dos decimales.
      expect(1.1 * 2.2).not.toBe(2.42);
      expect(areaDeMedidas('1.1', '2.2', '1')).toBe(2.42);
      expect(areaDeMedidas('0.07', '0.07', '1')).toBe(0);
    });

    it('redondea a dos decimales una sola vez, al final', () => {
      // 1,15 × 1,15 = 1,3225 → 1,32. Y por tres piezas, 3,9675 → 3,97, no 3 × 1,32.
      expect(areaDeMedidas('1.15', '1.15', '1')).toBe(1.32);
      expect(areaDeMedidas('1.15', '1.15', '3')).toBe(3.97);
    });

    it('nunca entrega más de dos decimales, que es lo que acepta la API', () => {
      for (const [a, b, n] of [
        ['3.33', '7.77', '7'],
        ['9.99', '9.99', '13'],
        ['0.17', '0.83', '5'],
      ] as const) {
        const area = areaDeMedidas(a, b, n);
        expect(Number(area.toFixed(2))).toBe(area);
      }
    });

    it('devuelve cero mientras falte un dato, para no mostrar un área a medias', () => {
      expect(areaDeMedidas('', '2.5', '2')).toBe(0);
      expect(areaDeMedidas('5', '', '2')).toBe(0);
      expect(areaDeMedidas('5', '2.5', '')).toBe(0);
      expect(areaDeMedidas('5', '2.5', '0')).toBe(0);
      expect(areaDeMedidas('mucho', '2.5', '2')).toBe(0);
    });
  });

  describe('campos de medida', () => {
    const alto = medidaCampoSchema('el alto');

    it('nombra el lado en el mensaje: un techo se mide de largo, no de alto', () => {
      expect(mensaje(medidaCampoSchema('el largo').safeParse(''))).toBe(
        'Indica el largo en metros',
      );
      expect(mensaje(alto.safeParse(''))).toBe('Indica el alto en metros');
      expect(mensaje(alto.safeParse('0'))).toBe('El alto debe ser mayor que cero');
    });

    it('acepta hasta dos decimales y rechaza el resto', () => {
      expect(alto.safeParse('2.5').success).toBe(true);
      expect(alto.safeParse('2,55').success).toBe(true);
      expect(mensaje(alto.safeParse('2.555'))).toBe('Usa como máximo dos decimales');
    });

    it('rechaza una medida desproporcionada', () => {
      expect(alto.safeParse('1000').success).toBe(true);
      expect(alto.safeParse('1001').success).toBe(false);
    });
  });

  describe('contador de piezas iguales', () => {
    it('exige al menos una y no admite decimales', () => {
      expect(repeticionesCampoSchema.safeParse('1').success).toBe(true);
      expect(repeticionesCampoSchema.safeParse('0').success).toBe(false);
      expect(repeticionesCampoSchema.safeParse('2.5').success).toBe(false);
      expect(repeticionesCampoSchema.safeParse('100').success).toBe(true);
      expect(repeticionesCampoSchema.safeParse('101').success).toBe(false);
    });
  });

  describe('formulario completo de medidas', () => {
    const schema = formularioMedidasSchema('el alto');
    const valido = {
      idVariante: '10',
      ancho: '5.0',
      ladoMayor: '2.5',
      repeticiones: '2',
    };

    it('acepta el caso del mockup', () => {
      expect(schema.safeParse(valido).success).toBe(true);
    });

    it('no pide las manos: las resuelve el servidor (K9)', () => {
      expect(schema.safeParse(valido).success).toBe(true);
      expect(schema.safeParse({ ...valido, ancho: '' }).success).toBe(false);
    });
  });
});

describe('Vocabulario de las superficies', () => {
  it('un techo se mide de ancho y largo', () => {
    const techos = superficiePorId('techos');
    expect(techos.etiquetaLadoMayor).toBe('Largo (m)');
    expect(techos.ladoMayor).toBe('el largo');
  });

  it('una pared se mide de ancho y alto', () => {
    expect(superficiePorId('paredes').etiquetaLadoMayor).toBe('Alto (m)');
  });

  it('cada superficie nombra su propio contador', () => {
    expect(superficiePorId('puertas').contador).toBe('Cantidad de puertas iguales');
    for (const s of SUPERFICIES) {
      expect(s.contador.startsWith('Cantidad de')).toBe(true);
    }
  });
});

describe('Presentación con la que abre la calculadora', () => {
  const producto = (ids: number[]): CalculadoraProducto => ({
    idProducto: 1,
    nombre: 'Viniltex Ultralavable',
    rendimientoMin: 10,
    rendimientoMax: 11.25,
    manosAplicadas: 2,
    presentaciones: ids.map((idVariante) => ({
      idVariante,
      presentacion: `${idVariante} galón`,
      volumenGalones: 1,
      rendimientoMin: 10,
      rendimientoMax: 11.25,
    })),
    advertencia: 'La cantidad es aproximada.',
  });

  it('abre en la presentación que la ficha ya tenía elegida', () => {
    expect(presentacionDeArranque(producto([7, 8, 9]), 8)).toBe('8');
  });

  it('sin presentación pedida abre en la primera', () => {
    expect(presentacionDeArranque(producto([7, 8, 9]), null)).toBe('7');
  });

  it('una presentación que no es de este producto no se usa', () => {
    // Pasa con una dirección vieja, o si la variante se desactivó entre la carga de la
    // ficha y la de la calculadora. Abrir con un id ajeno daría un 404 al calcular.
    expect(presentacionDeArranque(producto([7, 8, 9]), 999)).toBe('7');
  });

  it('un producto sin presentaciones no revienta', () => {
    expect(presentacionDeArranque(producto([]), 8)).toBe('');
  });
});
