/**
 * ============================================================================
 * CONTENIDO BASE E INICIALIZACIÓN — Frente propio FP-01 (landing page)
 * ============================================================================
 * Datos iniciales de respaldo (SSR / sin conexión) para la página de inicio.
 * En ejecución, `HeroSection`, `FeaturedProducts`, `CategoryExplorer` y
 * `ToolsBar` consultan los endpoints reales de `FP-01` (`/api/v1/landing/banners`)
 * y `M01` (`/api/v1/catalogo/productos` y `/api/v1/catalogo/categorias`).
 * ============================================================================
 */

export interface HeroSlideContent {
  id: string;
  idBanner?: number;
  titleLine1: string;
  titleLine2: string;
  description: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  customImageUrl?: string | null;
  /** Punto de enfoque de la foto subida (0 a 100): qué parte se ve al recortarla. */
  focoX?: number;
  focoY?: number;
}

export const heroSlides: ReadonlyArray<HeroSlideContent> = [
  {
    id: 'todo-para-tu-proyecto',
    titleLine1: 'Todo para tu proyecto,',
    titleLine2: 'en un solo lugar',
    description:
      'Pinturas arquitectónicas, esmaltes, impermeabilizantes y herramientas de las mejores marcas con envío a toda Colombia.',
    primaryCta: { label: 'Explorar catálogo', href: '/productos' },
    secondaryCta: { label: 'Centro de ayuda', href: '/centro-de-ayuda' },
  },
  {
    id: 'colores-y-acabados-para-renovar',
    titleLine1: 'Colores y acabados',
    titleLine2: 'para renovar tus espacios',
    description:
      'Descubre vinilos interiores, fachadas de máxima resistencia y protección para madera con rendimiento garantizado.',
    primaryCta: { label: 'Ver pinturas', href: '/productos?categoria=1' },
    secondaryCta: { label: 'Políticas de envío', href: '/politicas-de-envio' },
  },
  {
    id: 'herramientas-y-preparacion-profesional',
    titleLine1: 'Preparación y herramientas',
    titleLine2: 'de acabado profesional',
    description:
      'Estucos, lijas, cintas, rodillos y brochas seleccionadas para lograr superficies uniformes desde la primera mano.',
    primaryCta: { label: 'Ver herramientas', href: '/productos?categoria=6' },
    secondaryCta: { label: 'Conoce Pintu Clic', href: '/sobre-nosotros' },
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
      { value: '', label: 'Todas las categorías' },
      { value: '1', label: 'Pinturas' },
      { value: '2', label: 'Estucos y pastas' },
      { value: '3', label: 'Maderas' },
      { value: '4', label: 'Impermeabilizantes' },
      { value: '5', label: 'Solventes y preparadores' },
      { value: '6', label: 'Herramientas y accesorios' },
    ],
  },
  calculator: { label: 'Ver catálogo completo', href: '/productos' },
  colorAdvice: { label: 'Centro de ayuda y FAQ', href: '/centro-de-ayuda' },
};

export interface FeaturedProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  offerBadge?: string;
  imageUrl?: string;
  href: string;
}

export const featuredProducts: ReadonlyArray<FeaturedProduct> = [
  {
    id: '1',
    name: 'Viniltex Ultralavable',
    description: 'Pintuco · Viniltex · Vinilos para muros · Carta de colores',
    price: 28900,
    imageUrl: '/images/landing/catalogo-viniltex.png',
    href: '/productos/1',
  },
  {
    id: '2',
    name: 'Koraza Sol & Lluvia',
    description: 'Pintuco · Koraza · Pinturas para fachadas · Carta de colores',
    price: 99900,
    imageUrl: '/images/landing/catalogo-koraza.png',
    href: '/productos/2',
  },
  {
    id: '3',
    name: 'Pintulux 3 en 1',
    description: 'Pintuco · Pintulux · Esmaltes · Carta de colores',
    price: 31900,
    imageUrl: '/images/landing/catalogo-pintulux.png',
    href: '/productos/3',
  },
  {
    id: '4',
    name: 'Esmalte ICO',
    description: 'Pintuco · ICO · Esmaltes · Carta de colores',
    price: 27900,
    imageUrl: '/images/landing/catalogo-esmalte-ico.png',
    href: '/productos/4',
  },
  {
    id: '5',
    name: 'Barniz Transparente',
    description: 'Pintuco · Barnices · Carta de colores',
    price: 34900,
    imageUrl: '/images/landing/catalogo-barniz.png',
    href: '/productos/5',
  },
];

export const featuredLink = { label: 'Ver todos', href: '/productos' };

export interface CategoryTileContent {
  idCategoria: number;
  title: string;
  subtitle: string;
  href: string;
  imageSrc: string;
}

export const categoryTiles: ReadonlyArray<CategoryTileContent> = [
  {
    idCategoria: 1,
    title: 'Pinturas',
    subtitle: 'Vinilos, esmaltes y anticorrosivos',
    href: '/productos?categoria=1',
    imageSrc: '/images/landing/categoria-pinturas.png',
  },
  {
    idCategoria: 2,
    title: 'Estucos y pastas',
    subtitle: 'Preparación y acabado de muros',
    href: '/productos?categoria=2',
    imageSrc: '/images/landing/categoria-construccion.png',
  },
  {
    idCategoria: 3,
    title: 'Maderas',
    subtitle: 'Barnices, lacas y protectores',
    href: '/productos?categoria=3',
    imageSrc: '/images/landing/categoria-herramientas-manuales.png',
  },
  {
    idCategoria: 4,
    title: 'Impermeabilizantes',
    subtitle: 'Protección para techos y fachadas',
    href: '/productos?categoria=4',
    imageSrc: '/images/landing/categoria-herramientas-electricas.png',
  },
  {
    idCategoria: 6,
    title: 'Herramientas y accesorios',
    subtitle: 'Brochas, rodillos, cintas y lijas',
    href: '/productos?categoria=6',
    imageSrc: '/images/landing/categoria-accesorios.png',
  },
];
