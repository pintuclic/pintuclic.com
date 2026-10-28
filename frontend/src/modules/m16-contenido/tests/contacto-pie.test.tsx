import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Footer } from '@/core/components';
import type { ContactoPublico } from '../dtos/m16-contenido.dto';
import { contactoParaPie, enlaceTelefono } from '../services/contacto-pie';
import { footer } from '@/app/(public)/_data/shell.content';

const VACIO: ContactoPublico = { direccion: null, telefono: null, correo: null, facebook: null, instagram: null, youtube: null, tiktok: null };

describe('contacto del pie (M16 · HU-CON-05)', () => {
  it('sin ficha o con la ficha vacía no hay contacto ni redes inventados', () => {
    expect(contactoParaPie(null)).toEqual({ contact: [], socials: [] });
    expect(contactoParaPie(VACIO)).toEqual({ contact: [], socials: [] });
  });

  it('solo muestra lo que el administrador cargó, con su enlace', () => {
    const { contact, socials } = contactoParaPie({
      ...VACIO,
      telefono: '+57 322 123 4567',
      correo: 'hola@pintuclic.com',
      tiktok: 'https://www.tiktok.com/@pintuclic',
    });
    expect(contact).toEqual([
      { icon: 'telefono', label: '+57 322 123 4567', href: 'tel:+573221234567' },
      { icon: 'correo', label: 'hola@pintuclic.com', href: 'mailto:hola@pintuclic.com' },
    ]);
    expect(socials).toEqual([{ label: 'TikTok', href: 'https://www.tiktok.com/@pintuclic', icon: 'tiktok' }]);
  });

  it('el enlace del teléfono deja solo dígitos y el +', () => {
    expect(enlaceTelefono('(601) 555-1234')).toBe('tel:6015551234');
  });
});

describe('Footer con contacto real y pagos', () => {
  it('sin contacto ni redes no pinta la columna de contacto, y muestra la pasarela y los medios de pago', () => {
    const html = renderToStaticMarkup(<Footer {...footer} contact={[]} socials={[]} />);
    expect(html).not.toContain('Contacto');
    expect(html).not.toContain('Se abre en una pestaña');
    expect(html).toContain('Procesados por Wompi');
    expect(html).toContain('aria-label="Medios de pago aceptados"');
    expect(html).toContain('Nequi');
  });

  it('con contacto lo pinta junto a las redes', () => {
    const datos = contactoParaPie({ ...VACIO, direccion: 'Calle 10 # 5-20', facebook: 'https://www.facebook.com/pintuclic', tiktok: 'https://www.tiktok.com/@pintuclic' });
    const html = renderToStaticMarkup(<Footer {...footer} {...datos} />);
    expect(html).toContain('Calle 10 # 5-20');
    expect(html).toContain('TikTok');
    expect(html).toContain('href="https://www.facebook.com/pintuclic"');
  });
});
