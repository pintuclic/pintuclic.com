import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PanelCompraRapida } from '../components/publico/CompraRapidaModal';
import type { ProductoPublicoFicha, VariantePublica } from '../dtos/m01-catalogo-productos.dto';
import { presentacionInicial, requiereColor, subtituloProducto } from '../services/compra-rapida';

const variante = (id: number, cambios: Partial<VariantePublica> = {}): VariantePublica => ({
  idVariante: id,
  idMedida: id,
  medida: `Medida ${id}`,
  tipoMedida: 'galon',
  sku: `SKU-${id}`,
  precio: 10000 * id,
  disponibilidad: 'disponible',
  compraBloqueada: false,
  oferta: null,
  rendimiento: null,
  tieneImagenMedida: false,
  ...cambios,
});

const ficha = (cambios: Partial<ProductoPublicoFicha> = {}): ProductoPublicoFicha => ({
  idProducto: 7,
  nombre: 'Viniltex Ultralavable',
  descripcion: null,
  marca: 'Pintuco',
  linea: 'Viniltex',
  categoria: 'Pinturas',
  subcategoria: 'Vinilos',
  usoInterior: true,
  usoExterior: false,
  claseColor: 'entonable',
  tipoResina: null,
  tipoCalidad: null,
  manos: null,
  superficies: [],
  acabados: [],
  caracteristicas: [],
  variantes: [variante(1), variante(2)],
  esCombo: false,
  compraBloqueada: false,
  imagenes: [],
  ...cambios,
});

describe('presentacionInicial (U8)', () => {
  it('elige la primera disponible que se puede comprar', () => {
    const lista = [variante(1, { disponibilidad: 'agotado' }), variante(2), variante(3)];
    expect(presentacionInicial(lista)?.idVariante).toBe(2);
  });

  it('sin disponibles, la primera no bloqueada; si todas lo están, la primera', () => {
    expect(
      presentacionInicial([variante(1, { compraBloqueada: true }), variante(2, { disponibilidad: 'agotado' })])
        ?.idVariante,
    ).toBe(2);
    expect(presentacionInicial([variante(4, { compraBloqueada: true })])?.idVariante).toBe(4);
    expect(presentacionInicial([])).toBeNull();
  });
});

describe('requiereColor y subtituloProducto', () => {
  it('pide color a los entonables y a los de colores fijos, no a las herramientas', () => {
    expect(requiereColor({ claseColor: 'entonable' })).toBe(true);
    expect(requiereColor({ claseColor: 'colores_fijos' })).toBe(true);
    expect(requiereColor({ claseColor: 'sin_color' })).toBe(false);
  });

  it('muestra la marca y la línea si la tiene', () => {
    expect(subtituloProducto({ marca: 'Pintuco', linea: 'Viniltex' })).toBe('Pintuco · Viniltex');
    expect(subtituloProducto({ marca: 'Goya', linea: null })).toBe('Goya');
  });
});

describe('PanelCompraRapida', () => {
  const pintar = (f: ProductoPublicoFicha, v: VariantePublica | null = f.variantes[0] ?? null): string =>
    renderToStaticMarkup(
      <PanelCompraRapida
        ficha={f}
        variante={v}
        oferta={null}
        color={null}
        onElegirVariante={() => undefined}
        onElegirColor={() => undefined}
        onVerCarta={() => undefined}
      />,
    );

  it('muestra presentaciones, color sin elegir, cantidad y el enlace a la ficha', () => {
    const html = pintar(ficha());
    expect(html).toContain('Medida 1');
    expect(html).toContain('Medida 2');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('Aún no ha elegido un color');
    expect(html).toContain('Elige un color para agregarlo al carrito.');
    expect(html).toContain('href="/productos/7"');
    expect(html).toContain('Ver ficha completa');
  });

  it('un producto sin color no muestra el selector y deja agregar', () => {
    const html = pintar(ficha({ claseColor: 'sin_color', variantes: [variante(1)] }));
    expect(html).not.toContain('Aún no ha elegido un color');
    expect(html).toMatch(/<button[^>]*>(?:(?!<\/button>).)*Agregar al carrito/);
    expect(html).not.toMatch(/<button[^>]*disabled=""[^>]*>(?:(?!<\/button>).)*Agregar al carrito/);
  });

  it('un combo agotado avisa y no deja agregar', () => {
    const html = pintar(ficha({ claseColor: 'sin_color', compraBloqueada: true }));
    expect(html).toContain('Este combo está agotado por ahora');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>(?:(?!<\/button>).)*Agregar al carrito/);
  });
});
