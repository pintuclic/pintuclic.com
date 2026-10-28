import { describe, expect, it } from 'vitest';
import {
  ANCHO_ABANICO_ANGOSTO,
  DERIVA_MAXIMA,
  LEVANTE_LAMINA,
  acotarCentro,
  anguloDeLamina,
  centroAlSoltar,
  centroTrasArrastre,
  estiloDeLamina,
  geometriaAbanico,
  laminaCentral,
  laminaVisible,
  laminasVisibles,
  limitesCentro,
  necesitaMasColores,
  pasoDeTecla,
  rangoDibujado,
} from '../services/abanico';
import { colorDeTexto, luminanciaRelativa, parecidoEnPalabras, razonDeContraste } from '../services/contraste';
import { paletaAUrl, paletaDesdeUrl } from '../services/filtros-paleta';
import { ABANICO_LAMINAS_MOVIL, COLORES_EN_ABANICO } from '../dtos/m01-catalogo-paleta.dto';

describe('geometría del abanico (P14b, P14c)', () => {
  it('muestra menos láminas en pantallas angostas', () => {
    expect(laminasVisibles(ANCHO_ABANICO_ANGOSTO - 1)).toBe(ABANICO_LAMINAS_MOVIL);
    expect(laminasVisibles(ANCHO_ABANICO_ANGOSTO)).toBe(COLORES_EN_ABANICO);
    expect(laminasVisibles(1440)).toBe(COLORES_EN_ABANICO);
  });

  it('las láminas de los extremos nunca se salen por los lados, en ningún tamaño', () => {
    for (const [ancho, alto] of [[1440, 600], [1280, 560], [820, 700], [390, 560], [320, 500], [2000, 900]] as const) {
      const g = geometriaAbanico(ancho, alto);
      const maxAngulo = (g.paso * (g.visibles - 1)) / 2;
      // El punto más alejado de una lámina girada: la punta de arriba, a altoLamina del pivote.
      const alcance = g.altoLamina * Math.sin((maxAngulo * Math.PI) / 180) + g.anchoLamina / 2;
      expect(alcance, `${ancho}x${alto}`).toBeLessThanOrEqual(ancho / 2 + 1);
      expect(g.paso).toBeGreaterThan(0);
    }
  });

  it('el abanico llena el alto disponible y el ancho de lámina es táctil', () => {
    const g = geometriaAbanico(1440, 600);
    expect(g.altoLamina).toBeCloseTo(528, 0);
    expect(g.anchoLamina).toBeGreaterThanOrEqual(44);
    expect(geometriaAbanico(390, 500).anchoLamina).toBeGreaterThanOrEqual(44);
  });

  it('el ángulo es proporcional a la distancia al centro; el centro queda recto', () => {
    expect(anguloDeLamina(5, 5, 8)).toBe(0);
    expect(anguloDeLamina(7, 5, 8)).toBe(16);
    expect(anguloDeLamina(2.5, 5, 8)).toBe(-20);
  });

  it('solo las láminas dentro de la ventana se ven', () => {
    expect(laminaVisible(10, 10, 13)).toBe(true);
    expect(laminaVisible(16, 10, 13)).toBe(true);
    expect(laminaVisible(17, 10, 13)).toBe(false);
    expect(laminaVisible(4, 10, 13)).toBe(true);
    expect(laminaVisible(3, 10, 13)).toBe(false);
  });
});

describe('deslizar el abanico (P14b)', () => {
  it('con menos colores que láminas visibles, el abanico queda fijo y centrado', () => {
    expect(limitesCentro(7, 13)).toEqual({ minimo: 3, maximo: 3 });
    expect(limitesCentro(1, 13)).toEqual({ minimo: 0, maximo: 0 });
    expect(acotarCentro(0, 7, 13)).toBe(3);
  });

  it('con más colores, la ventana va de borde a borde sin dejar huecos', () => {
    expect(limitesCentro(50, 13)).toEqual({ minimo: 6, maximo: 43 });
    expect(acotarCentro(-5, 50, 13)).toBe(6);
    expect(acotarCentro(999, 50, 13)).toBe(43);
  });

  it('arrastrar a la izquierda avanza y a la derecha retrocede, sin salirse', () => {
    expect(centroTrasArrastre(20, -100, 50, 50, 13)).toBe(22);
    expect(centroTrasArrastre(20, 100, 50, 50, 13)).toBe(18);
    expect(centroTrasArrastre(7, 5000, 50, 50, 13)).toBe(6);
    expect(centroTrasArrastre(42, -5000, 50, 50, 13)).toBe(43);
  });

  it('al soltar queda una lámina entera; con inercia llega más lejos y sin ella, no', () => {
    expect(centroAlSoltar(20.4, 0, 50, 50, 13, true)).toBe(20);
    expect(centroAlSoltar(20.6, 0, 50, 50, 13, true)).toBe(21);
    const conInercia = centroAlSoltar(20, -1.5, 50, 50, 13, true);
    expect(conInercia).toBeGreaterThan(20);
    expect(centroAlSoltar(20, -1.5, 50, 50, 13, false)).toBe(20);
    // La inercia tiene tope y respeta los bordes.
    expect(centroAlSoltar(40, -50, 50, 50, 13, true)).toBe(43);
    expect(centroAlSoltar(8, 50, 50, 50, 13, true)).toBe(6);
  });

  it('la lámina central es la más cercana al centro, dentro de la lista', () => {
    expect(laminaCentral(3.6, 10)).toBe(4);
    expect(laminaCentral(-2, 10)).toBe(0);
    expect(laminaCentral(99, 10)).toBe(9);
    expect(laminaCentral(0, 0)).toBe(0);
  });

  it('pide más colores solo si faltan y al acercarse al final de lo cargado', () => {
    expect(necesitaMasColores(6, 48, 48, 13)).toBe(false);
    expect(necesitaMasColores(6, 48, 200, 13)).toBe(false);
    expect(necesitaMasColores(40, 48, 200, 13)).toBe(true);
    expect(necesitaMasColores(43, 48, 200, 13)).toBe(true);
  });

  it('las teclas mueven una lámina; Inicio y Fin van a los extremos; otras teclas no son suyas', () => {
    expect(pasoDeTecla('ArrowRight', 3, 10)).toBe(4);
    expect(pasoDeTecla('ArrowLeft', 3, 10)).toBe(2);
    expect(pasoDeTecla('ArrowLeft', 0, 10)).toBe(0);
    expect(pasoDeTecla('ArrowRight', 9, 10)).toBe(9);
    expect(pasoDeTecla('Home', 5, 10)).toBe(0);
    expect(pasoDeTecla('End', 5, 10)).toBe(9);
    expect(pasoDeTecla('Tab', 5, 10)).toBeNull();
    expect(pasoDeTecla('Enter', 5, 10)).toBeNull();
  });
});

describe('contraste del texto sobre un color (P15)', () => {
  const COLORES = ['#FFFFFF', '#000000', '#F7C600', '#2F6E9E', '#A3161E', '#C9CBCB', '#777777', '#808080', '#767676', '#00FF00', '#FF0000', '#0000FF', '#9CC9E8', '#1F2F55'];

  it('elige negro o blanco con al menos 4,5:1 sobre cualquier color', () => {
    for (const c of COLORES) {
      const texto = colorDeTexto(c);
      expect(razonDeContraste(c, texto), c).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('negro sobre claros y blanco sobre oscuros', () => {
    expect(colorDeTexto('#F7F5EF')).toBe('#000000');
    expect(colorDeTexto('#1E1E1E')).toBe('#FFFFFF');
    expect(colorDeTexto('#F7C600')).toBe('#000000');
    expect(colorDeTexto('#1F2F55')).toBe('#FFFFFF');
  });

  it('la luminancia va de 0 (negro) a 1 (blanco)', () => {
    expect(luminanciaRelativa('#000000')).toBe(0);
    expect(luminanciaRelativa('#FFFFFF')).toBeCloseTo(1, 5);
    expect(razonDeContraste('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
  });

  it('el ΔE se dice en palabras', () => {
    expect([parecidoEnPalabras(3, 6, 15), parecidoEnPalabras(6, 6, 15), parecidoEnPalabras(10, 6, 15), parecidoEnPalabras(15, 6, 15), parecidoEnPalabras(20, 6, 15)]).toEqual([
      'muy parecido', 'muy parecido', 'parecido', 'parecido', 'aproximado',
    ]);
  });
});

describe('estado de la página en la dirección (P5)', () => {
  const desde = (consulta: string) => paletaDesdeUrl(new URLSearchParams(consulta));

  it('lee familia, marca, texto y color', () => {
    expect(desde('familia=3&marca=2&q=azul&color=15')).toEqual({ familia: 3, idMarca: 2, q: 'azul', color: 15 });
    expect(desde('')).toEqual({ familia: null, idMarca: null, q: '', color: null });
  });

  it('ignora lo que no es un entero positivo', () => {
    expect(desde('familia=abc&marca=-1&color=0&q=')).toEqual({ familia: null, idMarca: null, q: '', color: null });
    expect(desde('color=1.5&familia=%20').color).toBeNull();
    expect(desde(`q=${'x'.repeat(300)}`).q).toHaveLength(100);
  });

  it('escribe solo lo que hay y vuelve a leerse igual', () => {
    expect(paletaAUrl({ familia: null, idMarca: null, q: '', color: null })).toBe('');
    expect(paletaAUrl({ familia: 3, idMarca: null, q: '  azul  ', color: 15 })).toBe('?familia=3&q=azul&color=15');
    const estado = { familia: 3, idMarca: 2, q: 'azul océano', color: 15 };
    expect(desde(paletaAUrl(estado).slice(1))).toEqual(estado);
  });
});

describe('láminas del abanico sin React (fluidez del arrastre)', () => {
  const geo = geometriaAbanico(1200, 700);

  it('estiloDeLamina: la central no gira y las lejanas se esconden', () => {
    const central = estiloDeLamina(10, 10, geo, false);
    expect(central.transform).toContain('rotate(0deg)');
    expect(central.opacity).toBe(1);
    expect(central.visible).toBe(true);
    const lejana = estiloDeLamina(40, 10, geo, false);
    expect(lejana.opacity).toBe(0);
    expect(lejana.visible).toBe(false);
  });

  it('estiloDeLamina: la elegida sube, crece y queda al frente', () => {
    const marcada = estiloDeLamina(10, 10, geo, true);
    expect(marcada.transform).toContain('scale(1.04)');
    expect(marcada.transform).toContain(`translateY(${-geo.altoLamina * LEVANTE_LAMINA}px)`);
    expect(marcada.zIndex).toBe(40);
    expect(estiloDeLamina(10, 10, geo, false).zIndex).toBeLessThan(40);
  });

  it('estiloDeLamina: con el centro a medio camino el giro es proporcional (arrastre continuo)', () => {
    const a = estiloDeLamina(5, 4.5, geo, false).transform;
    expect(a).toContain(`rotate(${0.5 * geo.paso}deg)`);
  });

  it('rangoDibujado: cubre la ventana visible aunque el centro vivo se aleje DERIVA_MAXIMA del ancla', () => {
    const ancla = 20;
    const { primero, ultimo } = rangoDibujado(ancla, 100, geo.visibles);
    const mitad = (geo.visibles - 1) / 2 + 0.5;
    for (const vivo of [ancla - DERIVA_MAXIMA, ancla + DERIVA_MAXIMA]) {
      expect(primero).toBeLessThanOrEqual(Math.ceil(vivo - mitad));
      expect(ultimo).toBeGreaterThanOrEqual(Math.floor(vivo + mitad));
    }
  });

  it('rangoDibujado: se acota a la lista y dibuja pocas láminas (no todas)', () => {
    expect(rangoDibujado(0, 100, 13).primero).toBe(0);
    expect(rangoDibujado(99, 100, 13).ultimo).toBe(99);
    const r = rangoDibujado(50, 1000, 13);
    expect(r.ultimo - r.primero + 1).toBeLessThan(30);
  });
});
