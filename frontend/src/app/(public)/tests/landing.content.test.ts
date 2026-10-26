import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { categoryTiles, featuredProducts, heroSlides, trustItems } from '../_data/home.content';
import { footer, header, topbarItems } from '../_data/shell.content';

/**
 * Integridad del contenido estático de la landing (FP-01). Mientras los datos no
 * vengan de M01/M05/M04, estas pruebas evitan que una edición del contenido deje
 * imágenes rotas, secciones incompletas o enlaces vacíos.
 */

const PUBLICO = join(process.cwd(), 'public');

function existeEnPublic(ruta: string): boolean {
  return existsSync(join(PUBLICO, ...ruta.split('/').filter(Boolean)));
}

describe('Landing · contenido de la página de inicio (UI Spec §4.1)', () => {
  it('tiene al menos una diapositiva de hero con ambos llamados a la acción', () => {
    expect(heroSlides.length).toBeGreaterThan(0);
    for (const slide of heroSlides) {
      expect(slide.primaryCta.href).toMatch(/^\//);
      expect(slide.secondaryCta.href).toMatch(/^\//);
    }
  });

  it('presenta los 4 pilares de confianza', () => {
    expect(trustItems).toHaveLength(4);
  });

  it('presenta 5 productos destacados con precios válidos', () => {
    expect(featuredProducts).toHaveLength(5);
    for (const producto of featuredProducts) {
      expect(producto.price).toBeGreaterThan(0);
      if (producto.originalPrice !== undefined) {
        expect(producto.originalPrice).toBeGreaterThan(producto.price);
      }
    }
  });

  it('presenta 5 categorías', () => {
    expect(categoryTiles).toHaveLength(5);
  });

  it('los identificadores de producto y los destinos de categoría no se repiten', () => {
    expect(new Set(featuredProducts.map((p) => p.id)).size).toBe(featuredProducts.length);
    expect(new Set(categoryTiles.map((c) => c.href)).size).toBe(categoryTiles.length);
  });
});

describe('Landing · todas las imágenes referenciadas existen en public/', () => {
  const imagenes = [
    header.logo.src,
    footer.logo.src,
    ...featuredProducts.flatMap((p) => (p.imageUrl ? [p.imageUrl] : [])),
    ...categoryTiles.map((c) => c.imageSrc),
  ];

  it.each(imagenes)('%s', (ruta) => {
    expect(existeEnPublic(ruta)).toBe(true);
  });
});

describe('Landing · cabecera y pie (UI Spec §3.1)', () => {
  it('el teléfono de la franja superior es un enlace tel:', () => {
    const telefono = topbarItems.find((item) => item.icon === 'telefono');
    expect(telefono?.href).toMatch(/^tel:\+57\d{10}$/);
  });

  it('el carrito de la cabecera lleva a /carrito (M05)', () => {
    expect(header.cart.href).toBe('/carrito');
  });

  it('la navegación incluye "Ofertas" como insignia', () => {
    const ofertas = header.navItems.find((item) => item.variant === 'pill');
    expect(ofertas?.label).toBe('Ofertas');
    expect(ofertas?.href).toBe('/productos?enOferta=true');
  });

  it('el mega-menú tiene los 3 grupos de la UI Spec §3.2', () => {
    expect(header.megaMenu.groups.map((g) => g.title)).toEqual([
      'Pinturas',
      'Construcción y Protección Personal',
      'Accesorios y Herramientas',
    ]);
  });

  it('ningún enlace interno queda vacío o como "#"', () => {
    const enlaces = [
      ...header.navItems.map((n) => n.href),
      ...((header.megaMenu.groups ?? []).flatMap((g) => g.items.map((i) => i.href))),
      ...((header.megaMenu.tabs ?? []).flatMap((t) =>
        t.columns.flatMap((c) => [
          ...c.items.map((i) => i.href),
          ...(c.verMasHref ? [c.verMasHref] : []),
        ])
      )),
      ...footer.columns.flatMap((c) => c.links.map((l) => l.href)),
      ...footer.legalLinks.map((l) => l.href),
    ];
    for (const href of enlaces) {
      // Ruta interna absoluta: "/" o "/algo"; nunca vacía, "#" ni relativa.
      expect(href).toMatch(/^\/([a-z0-9].*)?$/);
    }
  });
});
