import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Header, type HeaderProps } from '@/core/components/layout/Header';
import { EncabezadoFijo } from '@/core/components/layout/EncabezadoFijo';
import { AbanicoColores } from '../components/paleta/AbanicoColores';
import { CombinadorColores } from '../components/paleta/CombinadorColores';
import { FiltroPaleta } from '../components/paleta/FiltroPaleta';
import { OndaColor } from '../components/paleta/OndaColor';
import type { ColorPaleta } from '../dtos/m01-catalogo-paleta.dto';

/** Sin jsdom: se verifica el HTML que produce el servidor (semántica, accesibilidad, contrato de cada pieza). */

const AZUL: ColorPaleta = {
  idColor: 7,
  nombre: 'Azul Profundo',
  codigo: 'AZ-07',
  hexadecimal: '#1F3A93',
  idMarca: 1,
  marca: 'Marca Uno',
  idFamiliaColor: 2,
  familia: 'Azules',
  acabado: 'Mate',
  totalProductos: 3,
};

describe('OndaColor (P15)', () => {
  it('sin color elegido no pinta nada', () => {
    expect(renderToStaticMarkup(<OndaColor color={null} destinoId="productos-del-color" onVerProductos={() => undefined} />)).toBe('');
  });

  it('con color muestra su nombre, el código y el botón que baja a los productos', () => {
    const html = renderToStaticMarkup(<OndaColor color={AZUL} destinoId="productos-del-color" onVerProductos={() => undefined} />);
    expect(html).toContain('data-testid="onda-color"');
    expect(html).toContain('Azul Profundo');
    expect(html).toContain('AZ-07');
    expect(html).toContain('Ver productos en Azul Profundo');
    expect(html).toContain('aria-controls="productos-del-color"');
    expect(html).toContain('fill="#1F3A93"');
    // El texto sobre un azul oscuro es blanco (contraste).
    expect(html).toContain('color:#FFFFFF');
  });

  it('respeta prefers-reduced-motion', () => {
    const html = renderToStaticMarkup(<OndaColor color={AZUL} destinoId="x" onVerProductos={() => undefined} />);
    expect(html).toContain('prefers-reduced-motion: reduce');
  });
});

describe('CombinadorColores (P7–P10)', () => {
  it('sin color pide elegir uno en el abanico', () => {
    const html = renderToStaticMarkup(<CombinadorColores color={null} onElegir={() => undefined} />);
    expect(html).toContain('Combinador de colores');
    expect(html).toContain('Elige un color en el abanico');
  });

  it('es compacto: las armonías van en una fila, sin descripciones largas a la vista', () => {
    const html = renderToStaticMarkup(<CombinadorColores color={AZUL} onElegir={() => undefined} />);
    expect(html).toContain('p-4');
    expect(html).not.toContain('p-5');
  });

  it('ofrece las dos pestañas: el combinador y «En tu espacio»', () => {
    const html = renderToStaticMarkup(<CombinadorColores color={AZUL} onElegir={() => undefined} />);
    expect(html).toContain('role="tablist"');
    expect(html).toContain('En tu espacio');
    expect(html).toContain('Azul Profundo');
    expect(html).toContain('Marca Uno');
  });
});

describe('FiltroPaleta (P2–P4)', () => {
  const html = renderToStaticMarkup(
    <FiltroPaleta
      titulo="Colores"
      familias={[{ idFamiliaColor: 2, nombre: 'Azules', hexadecimal: '#1F3A93', total: 5 }]}
      marcas={[{ idMarca: 1, nombre: 'Marca Uno', total: 9 }]}
      familia={2}
      idMarca={null}
      texto="azul"
      onFamilia={() => undefined}
      onMarca={() => undefined}
      onTexto={() => undefined}
    />,
  );

  it('lista las familias con su cantidad y marca la elegida', () => {
    expect(html).toContain('Azules');
    expect(html).toContain('aria-pressed="true"');
  });

  it('cada familia lleva un tinte suave de su propio color', () => {
    expect(html).toContain('color-mix(in srgb, #1F3A93');
  });

  it('conserva el texto de la búsqueda', () => {
    expect(html).toContain('value="azul"');
  });
});

describe('AbanicoColores (P14)', () => {
  const base = {
    total: 0,
    cargando: false,
    cargandoMas: false,
    elegidoId: null,
    onElegir: () => undefined,
    onNecesitaMas: () => undefined,
    claveFiltro: '',
    onLimpiarFiltro: () => undefined,
  };

  it('sin colores explica por qué y deja limpiar el filtro', () => {
    const html = renderToStaticMarkup(<AbanicoColores {...base} colores={[]} />);
    expect(html).toMatch(/No hay colores/i);
    expect(html).toMatch(/Quitar|Limpiar/i);
  });

  it('es un grupo de opciones con una sola lámina en el orden de tabulación', () => {
    const colores = [AZUL, { ...AZUL, idColor: 8, nombre: 'Azul Cielo', hexadecimal: '#87CEEB' }, { ...AZUL, idColor: 9, nombre: 'Azul Noche', hexadecimal: '#101030' }];
    const html = renderToStaticMarkup(<AbanicoColores {...base} colores={colores} total={3} elegidoId={8} />);
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('role="radio"');
    expect((html.match(/tabindex="0"/g) ?? []).length).toBe(1);
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain('Azul Cielo');
    // Flechas para quien no puede arrastrar: botones reales de 44 px.
    expect(html).toMatch(/aria-label="[^"]*(anterior|siguiente)[^"]*"/i);
  });
});

describe('Cabecera fija (HU de cabecera)', () => {
  it('EncabezadoFijo deja todo fijo arriba, sin transform, y reserva el alto', () => {
    const html = renderToStaticMarkup(
      <EncabezadoFijo franja={<p>Envíos a todo el país</p>}>
        <header>Principal</header>
      </EncabezadoFijo>,
    );
    expect(html).toContain('fixed inset-x-0 top-0');
    expect(html).toContain('data-testid="franja-superior"');
    expect(html).toContain('data-visible="true"');
    expect(html).toContain('Envíos a todo el país');
    expect(html).not.toContain('transform');
    // Espaciador oculto a lectores de pantalla.
    expect(html).toContain('aria-hidden="true"');
  });

  it('el ítem «destacado» del menú se pinta como botón con su enlace', () => {
    const props: HeaderProps = {
      logo: { src: '/logo.png', alt: 'Pintu Clic, ir al inicio', width: 520, height: 303 },
      navItems: [
        { label: 'Ofertas', href: '/ofertas', variant: 'pill' },
        { label: 'Paleta de color', href: '/paleta-de-color', variant: 'destacado' },
      ],
      megaMenu: { groups: [], assistant: { text: 'Ayuda', ctaLabel: 'Encontrar', href: '/asesoria' } },
      account: { label: 'Mi cuenta', sublabel: 'Iniciar sesión', href: '/login' },
      cart: { count: 0, total: 0, href: '/carrito' },
    };
    const html = renderToStaticMarkup(<Header {...props} />);
    expect(html).toContain('href="/paleta-de-color"');
    expect(html).toContain('Paleta de color');
    // Va después de Ofertas.
    expect(html.indexOf('Paleta de color')).toBeGreaterThan(html.indexOf('Ofertas'));
  });
});
