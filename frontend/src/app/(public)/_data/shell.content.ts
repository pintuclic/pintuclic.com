/**
 * ============================================================================
 * CABECERA, NAVEGACIÓN Y PIE — Frente propio FP-01 (landing page)
 * ============================================================================
 * Cabecera, mega-menú y pie de las páginas públicas (UI Spec §3.1–§3.3).
 * Todos los enlaces apuntan a rutas reales implementadas en la plataforma
 * (`/productos` con los IDs reales de categoría/subcategoría de M01, y las
 * páginas institucionales/centro de ayuda de M16).
 * ============================================================================
 */

import type {
  FooterProps,
  HeaderProps,
  MegaMenuTab,
  TopbarItem,
} from '@/core/components';

export const topbarItems: ReadonlyArray<TopbarItem> = [
  { icon: 'envio', label: 'Envíos a toda Colombia', href: '/politicas-de-envio' },
  { icon: 'calidad', label: 'Productos de calidad', href: '/productos' },
  { icon: 'asesoria', label: 'Asesoría experta', href: '/centro-de-ayuda' },
  { icon: 'ayuda', label: '¿Necesitas ayuda?', href: '/centro-de-ayuda' },
  { icon: 'telefono', label: '322 123 4567', href: 'tel:+573221234567' },
];

export const megaMenuTabs: ReadonlyArray<MegaMenuTab> = [
  {
    id: 'paredes-techos',
    title: 'Paredes y Techos',
    icon: 'paredes',
    columns: [
      {
        title: 'Pinturas',
        items: [
          { label: 'Vinilos para muros', href: '/productos?subcategoria=1' },
          { label: 'Pinturas para fachadas', href: '/productos?subcategoria=2' },
        ],
        verMasHref: '/productos?superficie=1',
      },
    ],
  },
  {
    id: 'madera',
    title: 'Madera',
    icon: 'madera',
    columns: [
      {
        title: 'Pinturas y Barnices',
        items: [
          { label: 'Barnices', href: '/productos?subcategoria=10' },
          { label: 'Esmaltes', href: '/productos?subcategoria=3' },
        ],
        verMasHref: '/productos?superficie=2',
      },
    ],
  },
  {
    id: 'metal',
    title: 'Metal',
    icon: 'metal',
    columns: [
      {
        title: 'Pinturas para Metal',
        items: [
          { label: 'Esmaltes', href: '/productos?subcategoria=3' },
        ],
        verMasHref: '/productos?superficie=3',
      },
    ],
  },
  {
    id: 'otras-superficies',
    title: 'Otras Superficies',
    icon: 'superficies',
    columns: [],
  },
  {
    id: 'herramientas',
    title: 'Herramientas',
    icon: 'herramientas',
    columns: [
      {
        title: 'Aplicación',
        items: [
          { label: 'Brochas', href: '/productos?subcategoria=18' },
        ],
        verMasHref: '/productos?categoria=6',
      },
    ],
  },
];

export const header: HeaderProps = {
  logo: {
    src: '/images/landing/logo.png',
    alt: 'Pintu Clic, ir al inicio',
    width: 520,
    height: 303,
    className: 'h-11 w-auto lg:h-14',
  },
  categoriesLabel: '¿Qué buscas?',
  navItems: [
    { label: 'Inicio', href: '/' },
    { label: 'Productos', href: '/productos' },
    { label: 'Ofertas', href: '/productos?enOferta=true', variant: 'pill' },
    { label: 'Ayuda y FAQ', href: '/centro-de-ayuda' },
    { label: 'Sobre Nosotros', href: '/sobre-nosotros' },
  ],
  megaMenu: {
    tabs: megaMenuTabs,
    groups: [
      {
        title: 'Pinturas',
        items: [
          { label: 'Vinilos interior', href: '/productos?subcategoria=1' },
          { label: 'Vinilos exterior', href: '/productos?subcategoria=2' },
          { label: 'Esmaltes', href: '/productos?subcategoria=3' },
          { label: 'Anticorrosivos', href: '/productos?subcategoria=4' },
        ],
      },
      {
        title: 'Construcción y Protección Personal',
        items: [
          { label: 'Estucos plásticos', href: '/productos?subcategoria=5' },
          { label: 'Barnices y lacas para madera', href: '/productos?subcategoria=6' },
          { label: 'Tintes e inmunizantes', href: '/productos?subcategoria=7' },
          { label: 'Impermeabilizantes', href: '/productos?subcategoria=8' },
          { label: 'Solventes y preparadores', href: '/productos?subcategoria=9' },
        ],
      },
      {
        title: 'Accesorios y Herramientas',
        items: [
          { label: 'Brochas y rodillos', href: '/productos?subcategoria=10' },
          { label: 'Cintas y protección', href: '/productos?subcategoria=11' },
          { label: 'Lijas y espátulas', href: '/productos?subcategoria=12' },
          { label: 'Todas las herramientas', href: '/productos?categoria=6' },
        ],
      },
    ],
    assistant: {
      text: '¿No sabes qué pintura necesitas? Consulta nuestras guías o explora por superficie y ambiente',
      ctaLabel: 'Ir al centro de ayuda',
      href: '/centro-de-ayuda',
    },
  },
  account: { label: 'Mi cuenta', sublabel: 'Iniciar sesión', href: '/login' },
  cart: { count: 0, total: 0, href: '/carrito' },
};

export const footer: FooterProps = {
  brandName: 'Pintu Clic',
  logo: {
    src: '/images/landing/logo-footer.png',
    alt: 'Pintu Clic, ir al inicio',
    width: 520,
    height: 297,
    className: 'h-14 w-auto',
  },
  description: 'Todo para tu proyecto en un solo lugar. Calidad, asesoría y envío rápido a toda Colombia.',
  socials: [
    { label: 'Facebook', href: 'https://www.facebook.com', icon: 'facebook' },
    { label: 'Instagram', href: 'https://www.instagram.com', icon: 'instagram' },
    { label: 'YouTube', href: 'https://www.youtube.com', icon: 'youtube' },
  ],
  columns: [
    {
      title: 'Categorías',
      links: [
        { label: 'Pinturas interiores', href: '/productos?ambiente=interior' },
        { label: 'Pinturas exteriores', href: '/productos?ambiente=exterior' },
        { label: 'Maderas y barnices', href: '/productos?categoria=3' },
        { label: 'Herramientas y accesorios', href: '/productos?categoria=6' },
      ],
    },
    {
      title: 'Servicios y Ayuda',
      links: [
        { label: 'Catálogo completo', href: '/productos' },
        { label: 'Centro de ayuda', href: '/centro-de-ayuda' },
        { label: 'Preguntas frecuentes', href: '/centro-de-ayuda#preguntas-frecuentes' },
        { label: 'Sobre nosotros', href: '/sobre-nosotros' },
      ],
    },
  ],
  contactTitle: 'Contacto',
  contact: [
    { icon: 'ubicacion', label: 'Bogotá, Colombia' },
    { icon: 'telefono', label: '322 123 4567', href: 'tel:+573221234567' },
    { icon: 'correo', label: 'contacto@pintuclic.com', href: 'mailto:contacto@pintuclic.com' },
  ],
  legalLinks: [
    { label: 'Términos y condiciones', href: '/terminos-y-condiciones' },
    { label: 'Política de privacidad', href: '/politica-de-privacidad' },
    { label: 'Políticas de envío', href: '/politicas-de-envio' },
  ],
};
