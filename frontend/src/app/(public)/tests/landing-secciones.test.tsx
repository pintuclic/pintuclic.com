import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Container, ProductCard, ScrollRow, SeccionOnda } from '@/core/components';
import { TrustStrip } from '../_components/TrustStrip';

describe('secciones del inicio', () => {
  it('SeccionOnda: fondo azul con dos olas decorativas y el contenido dentro', () => {
    const html = renderToStaticMarkup(
      <SeccionOnda tituloId="t">
        <h2 id="t">Los más vendidos</h2>
      </SeccionOnda>,
    );
    expect(html).toContain('aria-labelledby="t"');
    expect(html).toContain('bg-corporate');
    expect(html.match(/<svg[^>]*aria-hidden="true"/g)).toHaveLength(2);
    expect(html).toContain('Los más vendidos');
  });

  it('Container: laterales más pequeños (12 / 16 / 24 px)', () => {
    const html = renderToStaticMarkup(<Container>x</Container>);
    expect(html).toContain('px-3 md:px-4 2xl:px-6');
  });

  it('TrustStrip: franja fina con los pilares', () => {
    const html = renderToStaticMarkup(<TrustStrip />);
    expect(html).toContain('Compra segura');
    expect(html).toContain('Pagos seguros');
    expect(html).toContain('py-2');
  });

  it('ScrollRow: una sola fila desplazable con nombre accesible', () => {
    const html = renderToStaticMarkup(
      <ScrollRow ariaLabel="Productos destacados">
        <ProductCard id="1" name="Viniltex" description="" price={1000} href="/productos/1" />
      </ScrollRow>,
    );
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-label="Productos destacados"');
    expect(html).toContain('overflow-x-auto');
    expect(html).not.toContain('flex-wrap');
  });
});
