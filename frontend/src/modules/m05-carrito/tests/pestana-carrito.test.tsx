import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ usePathname: () => '/' }));

describe('PestanaCarrito', () => {
  it('no se pinta mientras no se sabe que hay productos (se confirma en el navegador)', async () => {
    const { PestanaCarrito } = await import('../components/PestanaCarrito');
    // Sin sesión de navegador no hay resumen: la pestaña no aparece vacía ni con un cero.
    expect(renderToStaticMarkup(<PestanaCarrito onAbrir={() => undefined} />)).toBe('');
  });
});
