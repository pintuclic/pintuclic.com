import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Drawer } from '../components/overlays/Drawer';
import { abrirCarritoLateral, avisoDeApertura, EVENTO_ABRIR_CARRITO } from '../utils/eventos-carrito';

describe('Drawer (UI Spec §4.7, Variante A)', () => {
  it('es un diálogo con nombre, botón de cerrar y pie fijo', () => {
    const html = renderToStaticMarkup(
      <Drawer isOpen onClose={() => undefined} title="Tu carrito" subtitle="2 productos" footer={<p>Total</p>}>
        <p>Líneas</p>
      </Drawer>,
    );
    expect(html).toMatch(/role="dialog"[^>]*aria-modal="true"[^>]*aria-labelledby="([^"]+)"/);
    const id = /aria-labelledby="([^"]+)"/.exec(html)?.[1] ?? '';
    expect(html).toContain(`id="${id}"`);
    expect(html).toContain('Tu carrito');
    expect(html).toContain('aria-label="Cerrar"');
    expect(html).toContain('Total');
  });

  it('cerrado no pinta nada', () => {
    expect(renderToStaticMarkup(<Drawer isOpen={false} onClose={() => undefined} title="x">y</Drawer>)).toBe('');
  });
});

describe('Aviso para abrir el panel lateral (M05 · L1)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sin panel en la página nadie lo atiende y quien lo pidió sigue su camino', () => {
    vi.stubGlobal('window', new EventTarget());
    expect(abrirCarritoLateral()).toBe(false);
  });

  it('el panel lo reclama y recibe el mensaje de lo que se agregó', () => {
    const ventana = new EventTarget();
    vi.stubGlobal('window', ventana);
    let recibido: ReturnType<typeof avisoDeApertura> = null;
    ventana.addEventListener(EVENTO_ABRIR_CARRITO, (e) => {
      e.preventDefault();
      recibido = avisoDeApertura(e);
    });
    expect(abrirCarritoLateral({ tipo: 'agregado', texto: 'Agregaste Viniltex' })).toBe(true);
    expect(recibido).toEqual({ tipo: 'agregado', texto: 'Agregaste Viniltex' });
  });

  it('ignora mensajes que no tienen la forma esperada', () => {
    expect(avisoDeApertura(new CustomEvent('x', { detail: { tipo: 'otro', texto: 'a' } }))).toBeNull();
    expect(avisoDeApertura(new CustomEvent('x', { detail: null }))).toBeNull();
    expect(avisoDeApertura(new Event('x'))).toBeNull();
  });
});
