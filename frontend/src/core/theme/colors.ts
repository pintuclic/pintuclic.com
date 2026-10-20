/**
 * ==============================================================================
 * PALETA DE COLORES GLOBAL Y OFICIAL - PINTUCLIC DESIGN SYSTEM
 * ==============================================================================
 *
 * ⛔ REGLA DE ORO ESTRICTA:
 * Todo componente, vista o estilo en el frontend DEBE utilizar exclusivamente los
 * tokens de color definidos en este archivo y en Tailwind CSS.
 *
 * Queda TERMINANTEMENTE PROHIBIDO:
 * 1. Usar colores hexadecimales arbitrarios en clases (ej: bg-[#123456], text-[#000]).
 * 2. Usar colores por defecto de Tailwind no aprobados (ej: text-purple-500, bg-pink-400).
 * 3. Declarar variables CSS o estilos inline con colores que no pertenezcan a esta paleta.
 * ==============================================================================
 */

export const PINTUCLIC_COLORS = {
  // 1. Corporativo: Títulos principales, precios, navegación, header
  corporate: {
    DEFAULT: '#002855',
    dark: '#002855',
  },

  // 2. Acción: Botones primarios, enlaces, bordes activos, sliders
  action: {
    DEFAULT: '#0877E8',
    hover: '#0661BF',
  },

  // 3. SubAcción: Botones secundarios de selección, subprocesos (ej. Calculadora)
  subaction: {
    DEFAULT: '#DAEEFC',
  },

  // 4. Conversión: Botón "Agregar al Carrito", confirmaciones de compra
  conversion: {
    DEFAULT: '#41BF5A',
    hover: '#1B6D24',
    accent: '#3CB148',
  },

  // 5. Destacado: Etiquetas "Patrocinado", estrellas, badges comerciales
  highlight: {
    DEFAULT: '#FFC107',
  },

  // 6. Peligro: Cierre de sesión, eliminación, confirmaciones destructivas
  danger: {
    DEFAULT: '#E63946',
    hover: '#D62828',
    subtle: '#FDEDEE',
  },

  // 7. Ofertas: Badges promocionales de descuento y campañas comerciales
  offer: {
    DEFAULT: '#E63946',
    hover: '#D62839',
  },

  // 8. Neutros: Superficies, fondos, bordes y tipografía
  neutral: {
    white: '#FFFFFF',    // Fondos de tarjetas, modales, superficies principales
    lightest: '#F7F8FA', // Fondo general de página, fondo de imágenes de producto
    light: '#E5E7EB',    // Bordes, divisores, separadores, sliders inactivos
    medium: '#6B7280',   // Textos secundarios, descripciones, precios tachados
    dark: '#374151',     // Texto general de lectura, párrafos de cuerpo
    black: '#111827',    // Títulos de alta jerarquía (H1, H2), nombres de producto
  },
} as const;

export type PintuclicColors = typeof PINTUCLIC_COLORS;
