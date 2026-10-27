import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { getButtonClassName } from '../components/buttons/button-styles';
import { CategoryCard } from '../components/data-display/CategoryCard';
import { ProductCard } from '../components/data-display/ProductCard';
import { SearchBar } from '../components/forms/SearchBar';
import { Footer, type FooterProps } from '../components/layout/Footer';
import { Header, type HeaderProps } from '../components/layout/Header';
import { AdminLayout } from '../components/layout/AdminLayout';
import { AdminPageHeader } from '../components/layout/AdminPageHeader';
import { AdminStatCard } from '../components/data-display/AdminStatCard';
import { Carousel } from '../components/navigation/Carousel';
import { esColorMuyClaro } from '../utils/color-muestra';
import { formatCOP } from '../utils/moneda';

/**
 * Core Kit ampliado para la landing (FP-01). Sin jsdom en el proyecto, se
 * verifica el HTML que produce el servidor: semántica, accesibilidad y contrato
 * de cada componente.
 */

const LOGO = { src: '/images/landing/logo.png', alt: 'Pintu Clic, ir al inicio', width: 520, height: 303 };

describe('getButtonClassName', () => {
  it('conserva los tokens de las variantes existentes', () => {
    expect(getButtonClassName({ variant: 'primary-action' })).toContain('bg-action');
    expect(getButtonClassName({ variant: 'primary-conversion' })).toContain('hover:bg-conversion-hover');
    expect(getButtonClassName({ variant: 'outline', fullWidth: true })).toContain('w-full');
  });

  it('outline-light usa un anillo de foco claro, visible sobre fondos oscuros', () => {
    const clases = getButtonClassName({ variant: 'outline-light' });
    expect(clases).toContain('border-neutral-white/80');
    expect(clases).toContain('focus-visible:ring-neutral-white/80');
    expect(clases).not.toContain('focus-visible:ring-action/50');
  });
});

describe('formatCOP', () => {
  it('formatea pesos colombianos sin decimales', () => {
    expect(formatCOP(178900).replace(/\s/g, ' ')).toBe('$ 178.900');
  });
});

describe('ProductCard con href', () => {
  const html = renderToStaticMarkup(
    <ProductCard
      id="p1"
      name="Brocha Premium 3&quot;"
      price={12900}
      originalPrice={15000}
      isOffer
      offerBadgeText="-15%"
      imageUrl="/images/landing/producto-brocha.png"
      href="/productos/brocha-premium-3"
    />
  );

  it('el nombre, "Ver producto" y la acción de compra son enlaces a la ficha cuando no hay callback de carrito', () => {
    expect(html.match(/href="\/productos\/brocha-premium-3"/g)).toHaveLength(3);
    expect(html).toContain('aria-label="Ver producto: Brocha Premium 3&quot;"');
  });

  it('muestra el precio con el sufijo COP y la insignia de oferta', () => {
    expect(html).toContain('12.900 COP');
    expect(html).toContain('-15%');
  });

  it('la imagen declara dimensiones y texto alternativo', () => {
    expect(html).toMatch(/<img[^>]*alt="Brocha Premium 3&quot;"[^>]*width="400"[^>]*height="300"/);
  });
});

describe('ProductCard con color de muestra', () => {
  const fondo = (html: string): string => /data-muestra-color="[^"]*"[^>]*style="background:([^"]*)"/.exec(html)?.[1] ?? '';
  const tarjeta = (props: { swatchColor?: string; swatchLabel?: string; showViewDetails?: boolean } = {}): string =>
    renderToStaticMarkup(
      <ProductCard id="p2" name="Viniltex" price={85900} href="/productos/1" onAddToCart={() => undefined} {...props} />,
    );

  it('pinta un resplandor del color detrás del envase, oculto para el lector de pantalla', () => {
    const html = tarjeta({ swatchColor: '#9CC9E8' });
    expect(html).toMatch(/<div aria-hidden="true" data-muestra-color="#9CC9E8"[^>]*>/);
    expect(fondo(html)).toContain('radial-gradient(ellipse 75% 65% at 50% 78%, #9CC9E8d9 0%');
    expect(fondo(html)).not.toContain('rgb(17 24 39');
  });

  it('un color muy claro lleva una sombra tenue para notarse; uno muy oscuro, menos intensidad', () => {
    expect(fondo(tarjeta({ swatchColor: '#FDFDF8' }))).toContain('rgb(17 24 39 / 0.08)');
    expect(fondo(tarjeta({ swatchColor: '#111111' }))).toContain('#11111173 0%');
  });

  it('sin color, o con un color mal escrito, se queda el fondo neutro', () => {
    for (const html of [tarjeta(), tarjeta({ swatchColor: 'azul' })]) {
      expect(html).not.toContain('data-muestra-color');
      expect(html).toContain('bg-neutral-lightest');
    }
  });

  it('con callback, el carrito es un botón y no otro enlace', () => {
    expect(tarjeta().match(/href="\/productos\/1"/g)).toHaveLength(2);
    expect(tarjeta()).toContain('aria-label="Agregar Viniltex al carrito"');
  });

  it('muestra el nombre del color bajo el nombre del producto, solo si hay muestra', () => {
    expect(tarjeta({ swatchColor: '#9CC9E8', swatchLabel: 'Azul Cielo · y 45 colores más' })).toContain(
      'Azul Cielo · y 45 colores más',
    );
    expect(tarjeta({ swatchLabel: 'Azul Cielo' })).not.toContain('Azul Cielo');
  });
});

describe('ProductCard sin "Ver producto"', () => {
  const html = renderToStaticMarkup(
    <ProductCard id="p3" name="Koraza" price={99900} href="/productos/2" onAddToCart={() => undefined} showViewDetails={false} />,
  );

  it('no pinta "Ver producto" y deja el carrito junto al precio', () => {
    expect(html).not.toContain('Ver producto');
    expect(html).toMatch(/99\.900 COP<\/span><\/div><button[^>]*aria-label="Agregar Koraza al carrito"/);
  });

  it('la imagen lleva a la ficha sin repetir el enlace para el teclado', () => {
    expect(html).toMatch(/<a[^>]*tabindex="-1"[^>]*aria-hidden="true"[^>]*href="\/productos\/2"|<a[^>]*href="\/productos\/2"[^>]*tabindex="-1"[^>]*aria-hidden="true"/);
    expect(html.match(/href="\/productos\/2"/g)).toHaveLength(2);
  });

  it('con muestra, la foto no se mezcla con el color', () => {
    const conColor = renderToStaticMarkup(
      <ProductCard id="p4" name="ICO" price={27900} imageUrl="/x.png" swatchColor="#111111" showViewDetails={false} />,
    );
    expect(conColor).not.toContain('mix-blend-multiply');
    expect(conColor).toContain('drop-shadow-md');
  });
});

describe('esColorMuyClaro', () => {
  it('distingue blancos de colores con cuerpo', () => {
    expect(esColorMuyClaro('#FFFFFF')).toBe(true);
    expect(esColorMuyClaro('#F7F3E8')).toBe(true);
    expect(esColorMuyClaro('#9CC9E8')).toBe(false);
    expect(esColorMuyClaro('#000000')).toBe(false);
  });
});

describe('CategoryCard', () => {
  const html = renderToStaticMarkup(
    <CategoryCard title="Pinturas" href="/productos?categoria=pinturas" imageSrc="/images/landing/categoria-pinturas.png" />
  );

  it('toda la tarjeta es un único enlace con el nombre como texto real', () => {
    expect(html.match(/<a /g)).toHaveLength(1);
    expect(html).toContain('href="/productos?categoria=pinturas"');
    expect(html).toContain('Pinturas');
    expect(html).toContain('Ver productos');
  });

  it('el arte es decorativo (alt vacío)', () => {
    expect(html).toMatch(/<img[^>]*alt=""/);
  });
});

describe('SearchBar', () => {
  const html = renderToStaticMarkup(
    <SearchBar action="/productos" categories={[{ value: '', label: 'Todas' }, { value: 'pinturas', label: 'Pinturas' }]} />
  );

  it('es un formulario GET de búsqueda que funciona sin JavaScript', () => {
    // El orden de los atributos lo decide React: se comprueba cada uno por separado.
    const form = html.match(/<form[^>]*>/)?.[0] ?? '';
    expect(form).toContain('action="/productos"');
    expect(form).toContain('method="get"');
    expect(form).toContain('role="search"');
    expect(html).toMatch(/<input[^>]*name="q"/);
    expect(html).toMatch(/<select[^>]*name="categoria"/);
  });

  it('todos los controles tienen nombre accesible', () => {
    expect(html).toContain('aria-label="Buscar productos"');
    expect(html).toContain('aria-label="Buscar"');
    expect(html).toMatch(/<label[^>]*class="sr-only"[^>]*>Categoría<\/label>/);
  });
});

describe('Carousel', () => {
  it('con una sola diapositiva no muestra controles', () => {
    const html = renderToStaticMarkup(<Carousel ariaLabel="Banners" slides={[<p key="a">Uno</p>]} />);
    expect(html).toContain('aria-roledescription="carousel"');
    expect(html).not.toContain('Diapositiva siguiente');
  });

  it('con varias, ofrece flechas y puntos, y deja inertes las ocultas', () => {
    const html = renderToStaticMarkup(
      <Carousel ariaLabel="Banners" slides={[<p key="a">Uno</p>, <p key="b">Dos</p>]} />
    );
    expect(html).toContain('aria-label="Diapositiva anterior"');
    expect(html).toContain('aria-label="Diapositiva siguiente"');
    expect(html).toContain('aria-label="Ir a la diapositiva 2"');
    expect(html.match(/inert=""/g)).toHaveLength(1);
  });
});

describe('Header', () => {
  const props: HeaderProps = {
    logo: LOGO,
    navItems: [
      { label: 'Inicio', href: '/' },
      { label: 'Ofertas', href: '/ofertas', variant: 'pill' },
    ],
    megaMenu: { groups: [], assistant: { text: 'Ayuda', ctaLabel: 'Encontrar', href: '/asesoria' } },
    account: { label: 'Mi cuenta', sublabel: 'Iniciar sesión', href: '/login' },
    cart: { count: 3, total: 178900, href: '/carrito' },
  };
  const html = renderToStaticMarkup(<Header {...props} />).replace(/ /g, ' ');

  it('el carrito anuncia cantidad y total a los lectores de pantalla', () => {
    expect(html).toContain('aria-label="Carrito, 3 productos, total $ 178.900"');
  });

  it('expone navegación principal, cuenta y botón de categorías', () => {
    expect(html).toContain('aria-label="Principal"');
    expect(html).toContain('aria-label="Mi cuenta, Iniciar sesión"');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('Ofertas');
  });
});

describe('Footer', () => {
  const props: FooterProps = {
    brandName: 'Pintu Clic',
    logo: LOGO,
    description: 'Descripción',
    socials: [{ label: 'Facebook', href: 'https://www.facebook.com', icon: 'facebook' }],
    columns: [{ title: 'Servicios', links: [{ label: 'Calculadora', href: '/calculadora' }] }],
    contactTitle: 'Contacto',
    contact: [{ icon: 'correo', label: 'contacto@pintuclic.com', href: 'mailto:contacto@pintuclic.com' }],
    legalLinks: [{ label: 'Términos', href: '/terminos' }],
  };
  const html = renderToStaticMarkup(<Footer {...props} />);

  it('calcula el año en lugar de fijarlo', () => {
    expect(html).toContain(`© ${new Date().getFullYear()} Pintu Clic`);
  });

  it('las redes abren en pestaña nueva de forma segura y lo anuncian', () => {
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('(se abre en una pestaña nueva)');
  });

  it('cada columna de enlaces es un landmark de navegación', () => {
    expect(html).toContain('aria-label="Servicios"');
    expect(html).toContain('aria-label="Legal"');
  });
});

describe('Admin Core Kit (AdminLayout, AdminPageHeader, AdminStatCard)', () => {
  it('AdminLayout renderiza el sidebar full-height, el logo oficial, el menú sin jerga interna y el widget inferior', () => {
    const html = renderToStaticMarkup(
      <AdminLayout>
        <AdminPageHeader
          title="¡Hola, Carlos!"
          subtitle="Resumen del panel"
          metaPrimary="Viernes, 23 de octubre de 2026"
          metaSecondary="Pintu Clic Admin"
        />
      </AdminLayout>
    );

    expect(html).toContain('aria-label="Navegación administrativa"');
    expect(html).toContain('Hacemos crecer tu negocio');
    expect(html).not.toContain('Módulos M17');
    expect(html).toContain('Buscar productos, marcas, categorías o pedidos...');
    expect(html).toContain('¡Hola, Carlos!');
    expect(html).toContain('Pintu Clic Admin');
  });

  it('AdminStatCard muestra etiqueta, valor en color corporativo e indicador de tendencia', () => {
    const html = renderToStaticMarkup(
      <AdminStatCard
        label="Colaboradores activos"
        value="12"
        trendText="+100%"
        trendSubtext="en el equipo"
        trendType="positive"
        icon={<span>Icon</span>}
      />
    );

    expect(html).toContain('Colaboradores activos');
    expect(html).toContain('12');
    expect(html).toContain('+100%');
    expect(html).toContain('en el equipo');
    expect(html).toContain('text-corporate');
  });
});