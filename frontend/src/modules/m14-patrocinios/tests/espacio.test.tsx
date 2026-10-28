import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { AnuncioEditor, AVISO_SIN_MOVIL } from '../components/AnuncioEditor';
import { EspacioPublicitario } from '../components/EspacioPublicitario';
import { MedicionView } from '../components/MedicionView';
import { MedidorPatrocinio } from '../components/MedidorPatrocinio';
import { PatrociniosView } from '../components/PatrociniosView';
import type { Anuncio, AnuncioPublico } from '../dtos/m14-patrocinios.dto';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn(), replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/admin/patrocinios',
  useSearchParams: () => new URLSearchParams(),
}));

/** Sin jsdom en el proyecto, se verifica el HTML que produce el servidor; el comportamiento se prueba en el navegador. */
const html = (elemento: React.ReactElement) => renderToStaticMarkup(elemento);
const nada = () => undefined;

const publico = (sobre: Partial<AnuncioPublico> = {}): AnuncioPublico => ({
  idAnuncio: 1,
  textoAlternativo: 'Koraza protege tu fachada',
  urlClic: '/api/v1/patrocinios/anuncios/1/ir',
  abrirEnNuevaPestana: true,
  urlImagen: '/api/v1/patrocinios/anuncios/imagenes/1?variante=escritorio&v=5',
  urlImagenMovil: null,
  ...sobre,
});

describe('EspacioPublicitario (B4–B6, B10–B12)', () => {
  it('sin anuncios no pinta nada: no deja un hueco', () => {
    expect(html(<EspacioPublicitario espacio="inicio" anuncios={[]} />)).toBe('');
  });

  it('con un anuncio pinta la imagen entera como enlace, con la etiqueta «Publicidad» y sin controles', () => {
    const salida = html(<EspacioPublicitario espacio="inicio" anuncios={[publico()]} />);
    expect(salida).toContain('aria-label="Publicidad"');
    expect(salida).toMatch(/<span[^>]*>Publicidad<\/span>/);
    expect(salida).toContain('href="/api/v1/patrocinios/anuncios/1/ir"');
    expect(salida).toContain('target="_blank"');
    expect(salida).toContain('rel="sponsored noopener noreferrer"');
    expect(salida).toContain('alt="Koraza protege tu fachada"');
    expect(salida).not.toContain('Ver anuncio');
    expect(salida).not.toContain('Anuncio siguiente');
  });

  it('nunca publica la dirección real del anunciante: solo la redirección y las imágenes de la propia API', () => {
    const salida = html(<EspacioPublicitario espacio="inicio" anuncios={[publico()]} />);
    expect(salida).not.toMatch(/https?:\/\//);
  });

  it('reserva la proporción del espacio con variables de CSS (sin salto de página)', () => {
    expect(html(<EspacioPublicitario espacio="inicio" anuncios={[publico()]} />)).toContain('--aspecto-escritorio:1232 / 280');
    expect(html(<EspacioPublicitario espacio="catalogo" anuncios={[publico()]} />)).toContain('--aspecto-escritorio:1232 / 200');
  });

  it('sin imagen móvil el celular usa la proporción de escritorio; con una, reserva 4:3', () => {
    expect(html(<EspacioPublicitario espacio="inicio" anuncios={[publico()]} />)).toContain('--aspecto-movil:1232 / 280');
    const conMovil = html(
      <EspacioPublicitario espacio="inicio" anuncios={[publico({ urlImagenMovil: '/api/v1/patrocinios/anuncios/imagenes/1?variante=movil&v=5' })]} />,
    );
    expect(conMovil).toContain('--aspecto-movil:4 / 3');
    expect(conMovil).toContain('<source media="(max-width: 639px)"');
  });

  it('pide las dos versiones reducidas con srcset, nunca el original (B11)', () => {
    const salida = html(<EspacioPublicitario espacio="inicio" anuncios={[publico()]} />);
    expect(salida).toContain('tamano=pequeno 640w');
    expect(salida).toContain('tamano=mediano 1232w');
    expect(salida).not.toContain('tamano=original');
  });

  it('un enlace interno abre en la misma pestaña; sin enlace la imagen no es clicable', () => {
    const interno = html(<EspacioPublicitario espacio="ficha" anuncios={[publico({ abrirEnNuevaPestana: false })]} />);
    expect(interno).toContain('target="_self"');
    expect(interno).toContain('rel="sponsored"');
    const sinEnlace = html(<EspacioPublicitario espacio="ficha" anuncios={[publico({ urlClic: null, abrirEnNuevaPestana: false })]} />);
    expect(sinEnlace).not.toContain('<a ');
    expect(sinEnlace).toContain('alt="Koraza protege tu fachada"');
  });

  it('con varios anuncios ofrece flechas y un punto de 44×44 px por anuncio; solo el primero es alcanzable', () => {
    const salida = html(
      <EspacioPublicitario espacio="inicio" anuncios={[publico(), publico({ idAnuncio: 2 }), publico({ idAnuncio: 3 })]} />,
    );
    expect(salida).toContain('aria-label="Anuncio anterior"');
    expect(salida).toContain('aria-label="Anuncio siguiente"');
    expect(salida.match(/aria-label="Ver anuncio \d de 3"/g)).toHaveLength(3);
    expect(salida.match(/h-11 w-11/g)?.length).toBeGreaterThanOrEqual(3);
    expect(salida.match(/inert=""/g)).toHaveLength(2);
    expect(salida).toContain('aria-roledescription="carousel"');
  });

  it('el espacio usa el slider táctil: deja el desplazamiento vertical a la página', () => {
    expect(html(<EspacioPublicitario espacio="inicio" anuncios={[publico()]} />)).toContain('touch-pan-y');
  });
});

describe('MedidorPatrocinio', () => {
  it('no cambia lo que se ve: envuelve a la tarjeta con su clase', () => {
    const salida = html(
      <MedidorPatrocinio idCampania={3} ubicacion="listado" className="relative flex-1">
        <span>Tarjeta</span>
      </MedidorPatrocinio>,
    );
    expect(salida).toBe('<div class="relative flex-1"><span>Tarjeta</span></div>');
  });
});

const anuncioAdmin: Anuncio = {
  idAnuncio: 7,
  nombre: 'Banner Pintuco',
  anunciante: 'Pintuco',
  espacio: 'catalogo',
  textoAlternativo: 'Koraza',
  enlace: 'https://pintuco.com',
  fechaInicio: '2026-10-01',
  fechaFin: '2026-10-31',
  orden: 2,
  estado: 'activo',
  situacion: 'vigente',
  tieneImagenMovil: false,
  urlImagen: '/api/v1/admin/patrocinios/anuncios/7/imagen?variante=escritorio&v=5',
  urlImagenMovil: null,
  fechaCreacion: '2026-10-01T00:00:00.000Z',
  fechaActualizacion: '2026-10-01T00:00:00.000Z',
  actualizadoPor: null,
};

describe('Editor de anuncios', () => {
  const nuevo = html(<AnuncioEditor anuncio={null} onCancelar={nada} onGuardado={nada} />);

  it('pide anunciante, espacio, imágenes, texto alternativo, enlace y vigencia con ayuda en español', () => {
    for (const texto of [
      'Nuevo anuncio', 'Anunciante', 'Espacio', 'Imagen de escritorio y tablet', 'Imagen para celular (opcional)',
      'Texto alternativo', 'Enlace (opcional)', 'Desde (fecha)', 'Hasta (fecha)', 'Todo anuncio termina.',
      'Inicio · bajo el banner principal', 'Catálogo · sobre el listado', 'Ficha de producto · bajo los datos',
    ]) {
      expect(nuevo).toContain(texto);
    }
  });

  it('dice qué medida subir y avisa que sin imagen móvil se verá muy pequeña en celulares', () => {
    expect(nuevo).toContain('Recomendada 1232 × 280 px');
    expect(nuevo).toContain('Forma 4:3');
    expect(nuevo).toContain(AVISO_SIN_MOVIL);
  });

  it('no ofrece el carrito ni el pago como espacio', () => {
    expect(nuevo).not.toMatch(/carrito|pago/i);
  });

  it('al editar, el espacio no se puede cambiar y se muestra la imagen actual', () => {
    const salida = html(<AnuncioEditor anuncio={anuncioAdmin} onCancelar={nada} onGuardado={nada} />);
    expect(salida).toContain('Editar anuncio');
    expect(salida).toContain('No se puede cambiar: cree otro anuncio para otro espacio.');
    expect(salida).toContain('Imagen actual: se conserva si no elige otra.');
    expect(salida).toContain('tamano=mediano');
    expect(salida).toMatch(/<select[^>]*disabled/);
  });

  it('si ya tiene imagen móvil no avisa y ofrece quitarla', () => {
    const salida = html(
      <AnuncioEditor
        anuncio={{ ...anuncioAdmin, tieneImagenMovil: true, urlImagenMovil: '/api/v1/admin/patrocinios/anuncios/7/imagen?variante=movil&v=5' }}
        onCancelar={nada}
        onGuardado={nada}
      />,
    );
    expect(salida).not.toContain(AVISO_SIN_MOVIL);
    expect(salida).toContain('Quitar la imagen para celular');
  });

  it('el único submit es el de guardar; los demás botones son type="button"', () => {
    expect(nuevo.match(/type="submit"/g)).toHaveLength(1);
    expect(nuevo).toMatch(/type="button"[^>]*>(?:(?!<\/button>).)*Cancelar/s);
  });
});

describe('Panel y medición', () => {
  it('el panel tiene tres pestañas: campañas, anuncios y medición', () => {
    const salida = html(<PatrociniosView />);
    expect(salida).toContain('Campañas de productos');
    expect(salida).toMatch(/role="tab"[^>]*>Anuncios</);
    expect(salida).toMatch(/role="tab"[^>]*>Medición</);
    expect(salida).toContain('role="tabpanel"');
  });

  it('la medición avisa que las cifras son indicativas y no guardan quién ni desde dónde', () => {
    const salida = html(<MedicionView />);
    expect(salida).toContain('indicativas');
    expect(salida).toContain('No se guarda quién ni desde');
    expect(salida).toContain('Descargar CSV');
    expect(salida).toContain('Hasta 366 días');
  });
});
