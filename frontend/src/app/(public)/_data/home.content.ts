/**
 * ============================================================================
 * CONTENIDO ESTÁTICO TEMPORAL — Frente propio FP-01 (landing page)
 * ============================================================================
 * Secciones de la página de inicio, tomadas del mockup
 * (`docs/assets/mockups/VISTAS.pdf`, página 1) y de la UI Spec §4.1.
 *
 * ⚠️ Provisional por decisión del Director Humano (2026-10-22): los productos
 * destacados y las categorías serán datos reales de M01. Es contenido de UI, no
 * un catálogo sembrado en base de datos (Directiva #10).
 *
 * Las imágenes de `public/images/landing/` son marcadores extraídos del mockup:
 * se reemplazan sobrescribiendo los archivos, sin tocar el código.
 * ============================================================================
 */

export interface HeroSlideContent {
  id: string;
  titleLine1: string;
  titleLine2: string;
  description: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
}

export const heroSlides: ReadonlyArray<HeroSlideContent> = [
  {
    id: 'todo-para-tu-proyecto',
    titleLine1: 'Todo para tu proyecto,',
    titleLine2: 'en un solo lugar',
    description: 'Pinturas, herramientas y accesorios de las mejores marcas. Calidad, asesoría y envío rápido.',
    primaryCta: { label: 'Comprar ahora', href: '/productos' },
    secondaryCta: { label: 'Pedir asesoría', href: '/asesoria-de-color' },
  },
];

export type TrustIcon = 'seguridad' | 'calidad' | 'envio' | 'pagos';

export const trustItems: ReadonlyArray<{ icon: TrustIcon; title: string; text: string }> = [
  { icon: 'seguridad', title: 'Compra segura', text: 'Tus datos protegidos' },
  { icon: 'calidad', title: 'Productos de calidad', text: 'Las mejores marcas' },
  { icon: 'envio', title: 'Envíos rápidos', text: 'A toda Colombia' },
  { icon: 'pagos', title: 'Pagos seguros', text: 'Múltiples métodos' },
];

export const tools = {
  search: {
    action: '/productos',
    categories: [
      { value: '', label: 'Todas' },
      { value: 'pinturas', label: 'Pinturas' },
      { value: 'herramientas', label: 'Herramientas' },
      { value: 'accesorios', label: 'Accesorios' },
      { value: 'construccion', label: 'Construcción' },
    ],
  },
  calculator: { label: 'Calculadora', href: '/calculadora' },
  colorAdvice: { label: 'Asesorías de color', href: '/asesoria-de-color' },
};

export interface FeaturedProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  offerBadge?: string;
  imageUrl: string;
  href: string;
}

export const featuredProducts: ReadonlyArray<FeaturedProduct> = [
  {
    id: 'pintura-acrilica-premium',
    name: 'Pintura Acrílica Premium',
    description: 'Pintura de alta cobertura, lavable y resistente.',
    price: 89900,
    originalPrice: 104900,
    offerBadge: '-15%',
    imageUrl: '/images/landing/producto-pintura-acrilica.png',
    href: '/productos/pintura-acrilica-premium',
  },
  {
    id: 'taladro-inalambrico-20v',
    name: 'Taladro Inalámbrico 20V',
    description: 'Potente, ligero y resistente. Ideal para todo tipo de trabajo.',
    price: 299900,
    imageUrl: '/images/landing/producto-taladro.png',
    href: '/productos/taladro-inalambrico-20v',
  },
  {
    id: 'rodillo-profesional-9',
    name: 'Rodillo Profesional 9"',
    description: 'Rodillo de alta absorción para un acabado uniforme.',
    price: 24900,
    imageUrl: '/images/landing/producto-rodillo.png',
    href: '/productos/rodillo-profesional-9',
  },
  {
    id: 'brocha-premium-3',
    name: 'Brocha Premium 3"',
    description: 'Brocha de cerdas naturales para mejores acabados.',
    price: 12900,
    imageUrl: '/images/landing/producto-brocha.png',
    href: '/productos/brocha-premium-3',
  },
  {
    id: 'cinta-de-enmascarar',
    name: 'Cinta de Enmascarar',
    description: 'Cinta de papel crepado de alta adherencia.',
    price: 9900,
    imageUrl: '/images/landing/producto-cinta.png',
    href: '/productos/cinta-de-enmascarar',
  },
];

export const featuredLink = { label: 'Ver todos', href: '/productos' };

export const categoryTiles: ReadonlyArray<{ title: string; href: string; imageSrc: string }> = [
  { title: 'Pinturas', href: '/productos?categoria=pinturas', imageSrc: '/images/landing/categoria-pinturas.png' },
  {
    title: 'Herramientas eléctricas',
    href: '/productos?categoria=herramientas-electricas',
    imageSrc: '/images/landing/categoria-herramientas-electricas.png',
  },
  {
    title: 'Herramientas manuales',
    href: '/productos?categoria=herramientas-manuales',
    imageSrc: '/images/landing/categoria-herramientas-manuales.png',
  },
  {
    title: 'Construcción',
    href: '/productos?categoria=construccion',
    imageSrc: '/images/landing/categoria-construccion.png',
  },
  {
    title: 'Accesorios y más',
    href: '/productos?categoria=accesorios',
    imageSrc: '/images/landing/categoria-accesorios.png',
  },
];
