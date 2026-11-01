import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FotoAmbiente } from '../components/publico/simulador/FotoAmbiente';
import { SimuladorColor } from '../components/publico/simulador/SimuladorColor';
import {
  ADVERTENCIA_SIMULADOR,
  ambienteSimuladorSchema,
  catalogoAmbientesSchema,
  simuladorInputSchema,
} from '../dtos/m03-asesoria.dto';
import { AMBIENTE_POR_DEFECTO, AMBIENTES, ambientePorId } from '../services/ambientes';
import { leyendaDeVista, rotuloDeColor, sePuedeSimular, textoAccesible } from '../services/simulador';

const RAIZ = resolve(__dirname, '../../../../../');
const CARPETA_FOTOS = resolve(RAIZ, 'frontend/public/images/ambientes');

/** Un color que NINGUNA foto trae de fábrica, para poder afirmar que el que se ve es el elegido. */
const COLOR_PRUEBA = '#123456';

const SOL = { hexadecimal: '#FFC785', nombre: 'Sol De La Tarde', codigo: 'NRO96T' };
const AZUL = { hexadecimal: '#1F3A93', nombre: 'Azul Profundo', codigo: null };

/** La ruta pública de una foto (`/images/ambientes/sala.webp`) en el disco. */
const archivoDe = (imagen: string): string => resolve(RAIZ, 'frontend/public', `.${imagen}`);

/** Lee la cabecera de un WebP extendido (VP8X): si lleva canal alfa y cuánto mide. */
function cabeceraWebp(ruta: string): { formato: string; alfa: boolean; ancho: number; alto: number } {
  const b = readFileSync(ruta);
  const esWebp = b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP';
  const extendido = b.toString('ascii', 12, 16) === 'VP8X';
  return {
    formato: esWebp ? 'webp' : 'otro',
    // Solo el formato extendido declara el alfa; sin él, la foto no tiene transparencia.
    alfa: esWebp && extendido && ((b[20] ?? 0) & 0x10) !== 0,
    ancho: extendido ? 1 + b.readUIntLE(24, 3) : 0,
    alto: extendido ? 1 + b.readUIntLE(27, 3) : 0,
  };
}

describe('simulador · el DTO es espejo del contrato (S5, S7)', () => {
  const contrato = readFileSync(resolve(RAIZ, 'contracts/m03-asesoria.contract.ts'), 'utf8');

  it('el aviso del DTO es idéntico al del contrato', () => {
    expect(contrato).toContain(ADVERTENCIA_SIMULADOR);
  });

  it('el aviso habla de referencia y no promete el resultado', () => {
    expect(ADVERTENCIA_SIMULADOR.toLowerCase()).toContain('referencia');
    expect(ADVERTENCIA_SIMULADOR.toLowerCase()).not.toContain('así se verá');
  });

  it('el esquema del ambiente lleva la foto y el encuadre, igual que el contrato', () => {
    expect(contrato).toContain("imagen: z.string().regex(/^\\/images\\/ambientes\\/[a-z0-9-]+\\.webp$/)");
    expect(contrato).toContain("z.enum(['arriba', 'centro', 'abajo'])");
    expect(ambienteSimuladorSchema.shape).toHaveProperty('imagen');
    expect(ambienteSimuladorSchema.shape).toHaveProperty('encuadre');
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

  it('ofrece los cinco espacios acordados, en ese orden', () => {
    expect(AMBIENTES.map((a) => a.id)).toEqual(['sala', 'cocina', 'habitacion', 'bano', 'fachada']);
  });

  it('tiene interiores y una fachada exterior', () => {
    expect(AMBIENTES.filter((a) => a.tipo === 'interior')).toHaveLength(4);
    expect(AMBIENTES.filter((a) => a.tipo === 'exterior').map((a) => a.id)).toEqual(['fachada']);
  });

  it('el ambiente de arranque existe', () => {
    expect(AMBIENTES.some((a) => a.id === AMBIENTE_POR_DEFECTO)).toBe(true);
  });

  it('un id desconocido cae en el primero y la pantalla nunca se queda sin imagen', () => {
    expect(ambientePorId('no-existe').id).toBe(AMBIENTES[0]?.id);
    expect(ambientePorId('bano').id).toBe('bano');
  });

  it('el texto alternativo describe el espacio, no el color', () => {
    for (const a of AMBIENTES) expect(a.alt).not.toMatch(/#|pintad/i);
  });
});

describe('simulador · las fotos (S3, S12)', () => {
  for (const ambiente of AMBIENTES) {
    describe(ambiente.id, () => {
      it('su archivo existe', () => {
        expect(existsSync(archivoDe(ambiente.imagen)), ambiente.imagen).toBe(true);
      });

      it('es un WebP con canal alfa: sin él la pared no dejaría ver el color', () => {
        const cab = cabeceraWebp(archivoDe(ambiente.imagen));
        expect(cab.formato).toBe('webp');
        expect(cab.alfa, `${ambiente.imagen} perdió su transparencia`).toBe(true);
      });

      it('mide 1024 × 1024', () => {
        const cab = cabeceraWebp(archivoDe(ambiente.imagen));
        expect([cab.ancho, cab.alto]).toEqual([1024, 1024]);
      });
    });
  }

  it('no sobra ninguna foto sin ambiente', () => {
    const enDisco = readdirSync(CARPETA_FOTOS).filter((f) => f.endsWith('.webp')).sort();
    expect(enDisco).toEqual(AMBIENTES.map((a) => a.imagen.split('/').pop() as string).sort());
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
    const t = textoAccesible({ alt: 'Sala con un sofá' }, SOL);
    expect(t).toContain('Sala con un sofá');
    expect(t).toContain('Sol De La Tarde');
  });

  it('la leyenda dice «así se vería», nunca «así se verá»', () => {
    const l = leyendaDeVista({ nombre: 'Baño' }, SOL);
    expect(l).toContain('Así se vería');
    expect(l).toContain('aproximadamente');
    expect(l.toLowerCase()).not.toContain('así se verá');
  });
});

describe('FotoAmbiente · cada ambiente pintado (S3, S9)', () => {
  for (const ambiente of AMBIENTES) {
    describe(ambiente.id, () => {
      const html = renderToStaticMarkup(<FotoAmbiente ambiente={ambiente} color={COLOR_PRUEBA} etiqueta={ambiente.alt} />);

      it('es una imagen de su foto, con su texto alternativo', () => {
        // React 19 antepone un preload de la imagen; en el SSR real lo lleva al head.
        expect(html.match(/<img /g)).toHaveLength(1);
        expect(html).toContain(`src="${ambiente.imagen}"`);
        expect(html).toContain(`alt="${ambiente.alt}"`);
      });

      it('el color es el fondo de la propia imagen: se ve por la pared transparente', () => {
        expect(html).toContain(`background-color:${COLOR_PRUEBA}`);
        expect(html.match(new RegExp(COLOR_PRUEBA, 'gi'))).toHaveLength(1);
      });

      it('no pone nada encima de la foto ni mezcla que altere el color', () => {
        expect(html).not.toMatch(/mix-blend|<svg|<canvas|<div|opacity|filter/i);
      });

      it('recorta según su encuadre', () => {
        const clase = { arriba: 'object-top', centro: 'object-center', abajo: 'object-bottom' }[ambiente.encuadre];
        expect(html).toContain(clase);
      });

      it('anima el cambio de color y lo apaga con prefers-reduced-motion (S9)', () => {
        expect(html).toContain('transition-colors');
        expect(html).toContain('motion-reduce:transition-none');
      });

      it('sin etiqueta es decorativa: alt vacío para los lectores de pantalla', () => {
        const mini = renderToStaticMarkup(<FotoAmbiente ambiente={ambiente} color={COLOR_PRUEBA} />);
        expect(mini).toContain('alt=""');
      });
    });
  }

  it('cambiar de color solo cambia el estilo: la foto es la misma', () => {
    const a = renderToStaticMarkup(<FotoAmbiente ambiente={AMBIENTES[0]!} color="#123456" />);
    const b = renderToStaticMarkup(<FotoAmbiente ambiente={AMBIENTES[0]!} color="#654321" />);
    expect(a).not.toBe(b);
    expect(a.replace('#123456', '#654321')).toBe(b);
  });
});

describe('SimuladorColor (S1, S2, S6, S7, S8)', () => {
  it('sin color invita a elegir uno y no pone ninguna foto', () => {
    const html = renderToStaticMarkup(<SimuladorColor color={null} />);
    expect(html).toContain('data-testid="simulador-invitacion"');
    expect(html).toContain('Elige un color');
    expect(html).not.toContain('<img');
  });

  it('con un hexadecimal inválido tampoco pone ninguna foto (S9)', () => {
    const html = renderToStaticMarkup(<SimuladorColor color={{ hexadecimal: 'azul', nombre: 'Azul', codigo: null }} />);
    expect(html).toContain('data-testid="simulador-invitacion"');
    expect(html).not.toContain('<img');
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

    it('la foto grande tiene texto accesible con el espacio y el color (S9)', () => {
      expect(html).toContain('con las paredes pintadas en Sol De La Tarde');
    });

    it('las miniaturas son decorativas: ya tienen su nombre visible (S9)', () => {
      expect(html.match(/alt=""/g)).toHaveLength(AMBIENTES.length);
    });

    it('pone la foto grande y una miniatura por ambiente, todas con el color', () => {
      expect(html.match(/<img /g)).toHaveLength(AMBIENTES.length + 1);
      expect(html.match(/background-color:#FFC785/g)).toHaveLength(AMBIENTES.length + 1);
    });
  });
});
