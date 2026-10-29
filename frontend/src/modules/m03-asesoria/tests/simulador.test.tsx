import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EscenaAmbiente, ESCENAS } from '../components/publico/simulador/EscenaAmbiente';
import { SimuladorColor } from '../components/publico/simulador/SimuladorColor';
import {
  ADVERTENCIA_SIMULADOR,
  ambienteSimuladorSchema,
  catalogoAmbientesSchema,
  simuladorInputSchema,
} from '../dtos/m03-asesoria.dto';
import { AMBIENTE_POR_DEFECTO, AMBIENTES, ambientePorId } from '../services/ambientes';
import { aPuntos, puntoEnPlano, rectanguloEnPlano, rectPuntos, type PlanoPared } from '../services/geometria-escenas';
import { leyendaDeVista, rotuloDeColor, sePuedeSimular, textoAccesible } from '../services/simulador';

const RAIZ = resolve(__dirname, '../../../../../');

/** Un color que NINGÚN mueble usa, para poder afirmar que solo la pared lo lleva. */
const COLOR_PRUEBA = '#123456';

/** Los dibujos de ambiente, y solo ellos: los iconos también son <svg>. */
const ESCENA = 'viewBox="0 0 800 500"';

const SOL = { hexadecimal: '#FFC785', nombre: 'Sol De La Tarde', codigo: 'NRO96T' };
const AZUL = { hexadecimal: '#1F3A93', nombre: 'Azul Profundo', codigo: null };

describe('simulador · el DTO es espejo del contrato (S7)', () => {
  it('el aviso del DTO es idéntico al del contrato', () => {
    const contrato = readFileSync(resolve(RAIZ, 'contracts/m03-asesoria.contract.ts'), 'utf8');
    expect(contrato).toContain(ADVERTENCIA_SIMULADOR);
  });

  it('el aviso habla de referencia y no promete el resultado', () => {
    expect(ADVERTENCIA_SIMULADOR.toLowerCase()).toContain('referencia');
    expect(ADVERTENCIA_SIMULADOR.toLowerCase()).not.toContain('así se verá');
  });

  it('el simulador solo acepta un #RRGGBB', () => {
    expect(simuladorInputSchema.safeParse(SOL).success).toBe(true);
    expect(simuladorInputSchema.safeParse({ ...SOL, hexadecimal: 'FFC785' }).success).toBe(false);
    expect(simuladorInputSchema.safeParse({ ...SOL, hexadecimal: '#FFF' }).success).toBe(false);
  });
});

describe('simulador · catálogo de ambientes (S5)', () => {
  it('cumple el esquema del contrato', () => {
    expect(catalogoAmbientesSchema.safeParse(AMBIENTES).success).toBe(true);
    for (const a of AMBIENTES) expect(ambienteSimuladorSchema.safeParse(a).success, a.id).toBe(true);
  });

  it('ofrece los seis puntos de vista acordados, en ese orden', () => {
    expect(AMBIENTES.map((a) => a.id)).toEqual(['sala-frente', 'sala-esquina', 'alcoba', 'comedor', 'estudio', 'fachada']);
  });

  it('tiene interiores y una fachada exterior', () => {
    expect(AMBIENTES.some((a) => a.tipo === 'interior')).toBe(true);
    expect(AMBIENTES.filter((a) => a.tipo === 'exterior').map((a) => a.id)).toEqual(['fachada']);
  });

  it('cada ambiente tiene su dibujo y cada dibujo su ambiente', () => {
    expect(Object.keys(ESCENAS).sort()).toEqual(AMBIENTES.map((a) => a.id).sort());
  });

  it('el ambiente de arranque existe', () => {
    expect(AMBIENTES.some((a) => a.id === AMBIENTE_POR_DEFECTO)).toBe(true);
  });

  it('un id desconocido cae en el primero y la pantalla nunca se queda sin imagen', () => {
    expect(ambientePorId('no-existe').id).toBe(AMBIENTES[0]?.id);
    expect(ambientePorId('alcoba').id).toBe('alcoba');
  });

  it('el texto alternativo describe el espacio, no el color', () => {
    for (const a of AMBIENTES) expect(a.alt).not.toMatch(/#|pintad/i);
  });
});

describe('simulador · textos y reglas (S2, S7, S8, S9)', () => {
  it('solo se simula con un #RRGGBB válido', () => {
    expect(sePuedeSimular(null)).toBe(false);
    expect(sePuedeSimular({ hexadecimal: 'azul' })).toBe(false);
    expect(sePuedeSimular({ hexadecimal: '#FFF' })).toBe(false);
    expect(sePuedeSimular(SOL)).toBe(true);
  });

  it('el rótulo lleva el nombre y el código, o solo el nombre si no hay código', () => {
    expect(rotuloDeColor(SOL)).toBe('Sol De La Tarde · NRO96T');
    expect(rotuloDeColor(AZUL)).toBe('Azul Profundo');
    expect(rotuloDeColor({ nombre: 'Gris', codigo: '  ' })).toBe('Gris');
  });

  it('el texto accesible dice el espacio y el color', () => {
    const t = textoAccesible({ alt: 'Sala de frente' }, SOL);
    expect(t).toContain('Sala de frente');
    expect(t).toContain('Sol De La Tarde');
  });

  it('la leyenda dice «así se vería», nunca «así se verá»', () => {
    const l = leyendaDeVista({ nombre: 'Alcoba' }, SOL);
    expect(l).toContain('Así se vería');
    expect(l).toContain('aproximadamente');
    expect(l.toLowerCase()).not.toContain('así se verá');
  });
});

describe('simulador · geometría de los planos en perspectiva', () => {
  const PLANO: PlanoPared = { x0: 0, x1: 470, arriba0: 10, arriba1: 60, abajo0: 440, abajo1: 380 };

  it('las esquinas del plano caen donde se declaran', () => {
    expect(puntoEnPlano(PLANO, 0, 0)).toEqual({ x: 0, y: 10 });
    expect(puntoEnPlano(PLANO, 1, 0)).toEqual({ x: 470, y: 60 });
    expect(puntoEnPlano(PLANO, 0, 1)).toEqual({ x: 0, y: 440 });
    expect(puntoEnPlano(PLANO, 1, 1)).toEqual({ x: 470, y: 380 });
  });

  it('el centro del plano es el promedio de sus esquinas', () => {
    const c = puntoEnPlano(PLANO, 0.5, 0.5);
    expect(c.x).toBeCloseTo(235, 6);
    expect(c.y).toBeCloseTo((35 + 410) / 2, 6);
  });

  it('un rectángulo dentro del plano queda dentro del plano', () => {
    for (const p of rectanguloEnPlano(PLANO, 0.2, 0.6, 0.15, 0.7)) {
      expect(p.x).toBeGreaterThanOrEqual(PLANO.x0);
      expect(p.x).toBeLessThanOrEqual(PLANO.x1);
      expect(p.y).toBeGreaterThanOrEqual(Math.min(PLANO.arriba0, PLANO.arriba1));
      expect(p.y).toBeLessThanOrEqual(Math.max(PLANO.abajo0, PLANO.abajo1));
    }
  });

  it('los puntos se serializan para un <polygon>', () => {
    expect(rectPuntos(0, 0, 800, 340)).toBe('0,0 800,0 800,340 0,340');
    expect(aPuntos([{ x: 1.26, y: 2.04 }])).toBe('1.3,2');
  });
});

describe('simulador · cada ambiente dibujado (S3, S4)', () => {
  for (const ambiente of AMBIENTES) {
    describe(ambiente.id, () => {
      const html = renderToStaticMarkup(<EscenaAmbiente idAmbiente={ambiente.id} color={COLOR_PRUEBA} etiqueta={ambiente.alt} />);

      it('es un SVG con su texto accesible', () => {
        expect(html.startsWith('<svg')).toBe(true);
        expect(html).toContain('role="img"');
        expect(html).toContain(`aria-label="${ambiente.alt}"`);
      });

      it('SOLO la pared lleva el color: aparece únicamente como relleno de pared', () => {
        const apariciones = html.match(new RegExp(COLOR_PRUEBA, 'gi')) ?? [];
        const comoPared = html.match(new RegExp(`style="fill:${COLOR_PRUEBA}"`, 'gi')) ?? [];
        expect(apariciones.length).toBeGreaterThan(0);
        expect(apariciones.length).toBe(comoPared.length);
      });

      it('no usa imágenes ni mezclas que oscurezcan el color', () => {
        expect(html).not.toMatch(/<image|<img|href=|multiply|mix-blend/i);
      });

      it('no deja un degradado sin definir', () => {
        const definidos = new Set([...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
        const usados = [...html.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1]);
        expect(usados.length).toBeGreaterThan(0);
        for (const u of usados) expect(definidos.has(u), `falta el degradado ${u}`).toBe(true);
      });

      it('sin etiqueta es decorativo y se oculta a los lectores de pantalla', () => {
        const mini = renderToStaticMarkup(<EscenaAmbiente idAmbiente={ambiente.id} color={COLOR_PRUEBA} />);
        expect(mini).toContain('aria-hidden="true"');
        expect(mini).not.toContain('role="img"');
      });
    });
  }

  it('al repetir una escena en la página, sus identificadores no chocan', () => {
    const html = renderToStaticMarkup(
      <>
        <EscenaAmbiente idAmbiente="sala-frente" color={COLOR_PRUEBA} />
        <EscenaAmbiente idAmbiente="sala-frente" color="#654321" />
      </>,
    );
    const ids = [...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThan(5);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('un ambiente desconocido no rompe: dibuja el lienzo vacío', () => {
    const html = renderToStaticMarkup(<EscenaAmbiente idAmbiente="no-existe" color={COLOR_PRUEBA} />);
    expect(html).toContain('<svg');
    expect(html).not.toContain('data-pared');
  });
});

describe('SimuladorColor (S1, S2, S6, S7, S8)', () => {
  it('sin color invita a elegir uno y no dibuja nada', () => {
    const html = renderToStaticMarkup(<SimuladorColor color={null} />);
    expect(html).toContain('data-testid="simulador-invitacion"');
    expect(html).toContain('Elige un color');
    expect(html).not.toContain(ESCENA);
  });

  it('con un hexadecimal inválido tampoco dibuja nada (S9)', () => {
    const html = renderToStaticMarkup(<SimuladorColor color={{ hexadecimal: 'azul', nombre: 'Azul', codigo: null }} />);
    expect(html).toContain('data-testid="simulador-invitacion"');
    expect(html).not.toContain(ESCENA);
  });

  describe('con un color', () => {
    const html = renderToStaticMarkup(<SimuladorColor color={SOL} />);

    it('muestra el selector «Selecciona el ambiente:» como un grupo de radio', () => {
      expect(html).toContain('<fieldset');
      expect(html).toContain('Selecciona el ambiente:');
      expect(html.match(/type="radio"/g)).toHaveLength(AMBIENTES.length);
    });

    it('deja marcado un único ambiente, el de arranque', () => {
      expect(html.match(/checked=""/g)).toHaveLength(1);
      expect(html).toContain(`value="${AMBIENTE_POR_DEFECTO}"`);
    });

    it('cada miniatura muestra el nombre del ambiente', () => {
      for (const a of AMBIENTES) expect(html).toContain(`>${a.nombre}</span>`);
    });

    it('identifica el color con su nombre y su código (S8)', () => {
      expect(html).toContain('Sol De La Tarde · NRO96T');
    });

    it('el rótulo se lee sobre su propio color: negro sobre claro, blanco sobre oscuro (S8)', () => {
      expect(html).toContain('color:#000000');
      const oscuro = renderToStaticMarkup(<SimuladorColor color={AZUL} />);
      expect(oscuro).toContain('color:#FFFFFF');
    });

    it('lleva el aviso fijo de que es una referencia (S7)', () => {
      expect(html).toContain(ADVERTENCIA_SIMULADOR);
      expect(html).toContain('Así se vería');
    });

    it('la imagen grande tiene texto accesible con el espacio y el color (S9)', () => {
      expect(html).toContain('role="img"');
      expect(html).toContain('con las paredes pintadas en Sol De La Tarde');
    });

    it('dibuja la vista grande y una miniatura por ambiente, todas con el color', () => {
      expect(html.split(ESCENA).length - 1).toBe(AMBIENTES.length + 1);
      expect(html).toContain('fill:#FFC785');
    });
  });
});
