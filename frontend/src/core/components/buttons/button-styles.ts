/**
 * Estilos canónicos de botón (UI Spec v1.0 §2.6).
 *
 * Fuente única compartida por `Button` (acción) y `ButtonLink` (navegación): un
 * enlace con apariencia de botón no puede divergir visualmente de un botón.
 */

export type ButtonVariant =
  | 'primary-action'
  | 'primary-conversion'
  | 'selection'
  | 'outline'
  | 'outline-light'
  | 'ghost'
  | 'danger';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  selected?: boolean;
  fullWidth?: boolean;
  className?: string;
}

const BASE =
  'inline-flex items-center justify-center font-title font-medium rounded-btn transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 select-none cursor-pointer';

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5 min-h-[36px]',
  md: 'px-4 py-2.5 text-sm gap-2 min-h-[44px]', // 44px min para área táctil móvil WCAG
  lg: 'px-6 py-3.5 text-base gap-2.5 min-h-[48px]',
};

// Estado deshabilitado oficial (#E5E7EB fondo, #6B7280 texto, cursor not-allowed)
const DISABLED =
  'disabled:bg-neutral-light disabled:text-neutral-medium disabled:border-transparent disabled:shadow-none disabled:cursor-not-allowed disabled:scale-100 disabled:opacity-80';

const RING_DEFAULT = 'focus-visible:ring-action/50';
// Sobre fondos oscuros (hero) el anillo azul no se ve: se usa uno claro.
const RING_ON_DARK = 'focus-visible:ring-neutral-white/80';

function estilosDeVariante(variant: ButtonVariant, selected: boolean): string {
  switch (variant) {
    case 'primary-action':
      return `${RING_DEFAULT} bg-action text-neutral-white shadow-sm hover:bg-action-hover active:scale-[0.98]`;
    case 'primary-conversion':
      return `${RING_DEFAULT} bg-conversion text-neutral-white shadow-sm hover:bg-conversion-hover active:scale-[0.98]`;
    case 'selection':
      return selected
        ? `${RING_DEFAULT} bg-subaction text-corporate border-2 border-action shadow-xs font-semibold`
        : `${RING_DEFAULT} bg-neutral-white text-neutral-dark border border-neutral-light hover:border-action/50 hover:bg-subaction/30 active:scale-[0.98]`;
    case 'outline':
      return `${RING_DEFAULT} bg-neutral-white text-action border border-action hover:bg-action hover:text-neutral-white active:scale-[0.98]`;
    case 'outline-light':
      return `${RING_ON_DARK} bg-transparent text-neutral-white border border-neutral-white/80 hover:bg-neutral-white/10 active:scale-[0.98]`;
    case 'ghost':
      return `${RING_DEFAULT} bg-transparent text-neutral-dark hover:bg-neutral-light/60 active:scale-[0.98]`;
    case 'danger':
      return `${RING_DEFAULT} bg-danger text-neutral-white shadow-sm hover:bg-danger/90 active:scale-[0.98]`;
  }
}

export function getButtonClassName({
  variant = 'primary-action',
  size = 'md',
  selected = false,
  fullWidth = false,
  className = '',
}: ButtonStyleOptions = {}): string {
  return [
    BASE,
    SIZES[size],
    estilosDeVariante(variant, selected),
    DISABLED,
    fullWidth ? 'w-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
}
