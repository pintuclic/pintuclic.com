/**
 * ============================================================================
 * CONTENIDO ESTÁTICO TEMPORAL — Frente propio FP-01 (landing page)
 * ============================================================================
 * Cabecera, navegación y pie de las páginas públicas, tomados del mockup
 * (`docs/assets/mockups/VISTAS.pdf`, página 1) y de la UI Spec §3.1–§3.3.
 *
 * ⚠️ Provisional por decisión del Director Humano (2026-10-22): los datos del
 * carrito y de la sesión los alimentarán M05 y M04; las categorías, M01. Hasta
 * entonces viven aquí, en un único archivo, para sustituirlos de un solo golpe.
 *
 * Es UI, no catálogo de negocio: no se siembra ni se inserta en ninguna base de
 * datos (Directiva #10).
 * ============================================================================
 */

import type {
  FooterProps,
  HeaderProps,
  TopbarItem,
} from '@/core/components';

export const topbarItems: ReadonlyArray<TopbarItem> = [
  { icon: 'envio', label: 'Envíos a toda Colombia' },
  { icon: 'calidad', label: 'Productos de calidad' },
  { icon: 'asesoria', label: 'Asesoría experta' },
  { icon: 'ayuda', label: '¿Necesitas ayuda?' },
  { icon: 'telefono', label: '322 123 4567', href: 'tel:+573221234567' },
];

export const header: HeaderProps = {
  logo: {
    src: '/images/landing/logo.png',
    alt: 'Pintu Clic, ir al inicio',
    width: 520,
    height: 303,
    className: 'h-11 w-auto lg:h-14',
  },
  navItems: [
    { label: 'Inicio', href: '/' },
    { label: 'Productos', href: '/productos' },
    { label: 'Ofertas', href: '/ofertas', variant: 'pill' },
    { label: 'Servicios', href: '/servicios' },
    { label: 'Paleta de Color', href: '/paleta-de-color' },
    { label: 'Sobre Nosotros', href: '/sobre-nosotros' },
  ],
  megaMenu: {
    groups: [
      {
        title: 'Pinturas',
        items: [
          { label: 'Decorativos', href: '/productos?categoria=decorativos' },
          { label: 'Metales', href: '/productos?categoria=metales' },
          { label: 'Automotriz', href: '/productos?categoria=automotriz' },
          { label: 'Mantenimiento industrial', href: '/productos?categoria=mantenimiento-industrial' },
        ],
      },
      {
        title: 'Construcción y Protección Personal',
        items: [
          { label: 'Estuco', href: '/productos?categoria=estuco' },
          { label: 'Graniplas', href: '/productos?categoria=graniplas' },
          { label: 'Siliconas', href: '/productos?categoria=siliconas' },
          { label: 'Guantes', href: '/productos?categoria=guantes' },
          { label: 'Gafas', href: '/productos?categoria=gafas' },
          { label: 'Respiradores', href: '/productos?categoria=respiradores' },
        ],
      },
      {
        title: 'Accesorios y Herramientas',
        items: [
          { label: 'Rodillos', href: '/productos?categoria=rodillos' },
          { label: 'Brochas', href: '/productos?categoria=brochas' },
          { label: 'Cintas', href: '/productos?categoria=cintas' },
          { label: 'Lijas', href: '/productos?categoria=lijas' },
          { label: 'Eléctricas', href: '/productos?categoria=herramientas-electricas' },
          { label: 'Manuales', href: '/productos?categoria=herramientas-manuales' },
          { label: 'Neumáticas', href: '/productos?categoria=herramientas-neumaticas' },
          { label: 'Inalámbricas', href: '/productos?categoria=herramientas-inalambricas' },
        ],
      },
    ],
    assistant: {
      text: '¿No sabes qué pintura necesitas? Te ayudamos a encontrar el ideal para tu proyecto',
      ctaLabel: 'Encontrar pintura ideal',
      href: '/asesoria-de-color',
    },
  },
  account: { label: 'Mi cuenta', sublabel: 'Iniciar sesión', href: '/login' },
  // TEMPORAL: los valores del mockup. M05 alimentará el carrito real.
  cart: { count: 3, total: 178900, href: '/carrito' },
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
  // TEMPORAL: dominios genéricos hasta recibir las cuentas oficiales de redes.
  socials: [
    { label: 'Facebook', href: 'https://www.facebook.com', icon: 'facebook' },
    { label: 'Instagram', href: 'https://www.instagram.com', icon: 'instagram' },
    { label: 'YouTube', href: 'https://www.youtube.com', icon: 'youtube' },
  ],
  columns: [
    {
      title: 'Categorías',
      links: [
        { label: 'Pinturas interiores', href: '/productos?categoria=pinturas-interiores' },
        { label: 'Pinturas exteriores', href: '/productos?categoria=pinturas-exteriores' },
        { label: 'Herramientas', href: '/productos?categoria=herramientas' },
        { label: 'Accesorios', href: '/productos?categoria=accesorios' },
      ],
    },
    {
      title: 'Servicios',
      links: [
        { label: 'Asesoría de color', href: '/asesoria-de-color' },
        { label: 'Calculadora de pintura', href: '/calculadora' },
        { label: 'Directorio de pintores', href: '/directorio-de-pintores' },
        { label: 'Centro de ayuda', href: '/centro-de-ayuda' },
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
