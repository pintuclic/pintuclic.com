import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { CampaniaEditor } from '../components/CampaniaEditor';
import { PatrociniosView } from '../components/PatrociniosView';
import { ProductosPatrocinados } from '../components/ProductosPatrocinados';
import { SelectorObjetivos } from '../components/SelectorObjetivos';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn(), replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/admin/patrocinios',
  useSearchParams: () => new URLSearchParams(),
}));

/**
 * Sin jsdom en el proyecto, se verifica el HTML que produce el servidor: campos, semántica y textos.
 */
const html = (elemento: React.ReactElement) => renderToStaticMarkup(elemento);
const nada = () => undefined;

describe('Editor de campañas (M14)', () => {
  const salida = html(<CampaniaEditor campania={null} onCancelar={nada} onGuardado={nada} />);

  it('pide nombre, vigencia, prioridad y dónde se muestra, con ayuda en español', () => {
    expect(salida).toContain('Nueva campaña de patrocinio');
    expect(salida).toContain('Nombre de la campaña');
    expect(salida).toContain('Desde (fecha)');
    expect(salida).toContain('Hasta (fecha)');
    expect(salida).toContain('Prioridad (0 a 100)');
    expect(salida).toContain('Dónde se muestra');
    expect(salida).toContain('Catálogo y búsqueda');
    expect(salida).toContain('Página de inicio');
    expect(salida).toContain('Ficha del producto');
    expect(salida).toContain('Toda campaña termina.');
  });

  it('explica que una marca o una línea cubre sus productos, también los nuevos', () => {
    expect(salida).toContain('también los que se creen después');
  });

  it('los botones que no envían el formulario son type="button" y el de guardar es el único submit', () => {
    expect(salida.match(/type="submit"/g)).toHaveLength(1);
    expect(salida).toMatch(/type="button"[^>]*>(?:(?!<\/button>).)*Cancelar/s);
    expect(salida).toMatch(/<button[^>]*disabled=""[^>]*>(?:(?!<\/button>).)*Ver qué productos cubre/s);
  });
});

describe('Selector de objetivos', () => {
  it('ofrece marca, línea y producto', () => {
    const salida = html(<SelectorObjetivos valor={[]} onChange={nada} maximo={50} />);
    expect(salida).toContain('Marca');
    expect(salida).toContain('Línea');
    expect(salida).toContain('Producto');
  });

  it('lista lo elegido con un botón accesible para quitarlo', () => {
    const salida = html(
      <SelectorObjetivos valor={[{ tipo: 'linea', id: 1, nombre: 'Pintuco · Viniltex' }]} onChange={nada} maximo={50} />,
    );
    expect(salida).toContain('Pintuco · Viniltex');
    expect(salida).toContain('aria-label="Quitar Línea Pintuco · Viniltex"');
  });

  it('al llegar al máximo deja de ofrecer buscar', () => {
    const salida = html(<SelectorObjetivos valor={[{ tipo: 'marca', id: 1, nombre: 'A' }]} onChange={nada} maximo={1} />);
    expect(salida).toContain('Llegó al máximo de 1 elementos.');
    expect(salida).not.toContain('Buscar marca');
  });
});

describe('Panel de patrocinios', () => {
  it('muestra el título y la lista de campañas', () => {
    const salida = html(<PatrociniosView />);
    expect(salida).toContain('Patrocinios');
    expect(salida).toContain('Campañas de productos');
    expect(salida).toContain('Nueva campaña');
  });
});

describe('Bloque «Productos patrocinados» del inicio', () => {
  it('no pinta nada hasta tener productos: el inicio nunca queda con un hueco', () => {
    expect(html(<ProductosPatrocinados />)).toBe('');
  });
});
