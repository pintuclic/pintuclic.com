import React from 'react';

export type IconButtonVariant = 'overlay' | 'light' | 'ghost';
export type IconButtonSize = 'sm' | 'md';

export interface IconButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  /** Obligatorio: un botón sin texto necesita un nombre accesible. */
  'aria-label': string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
}

const BASE =
  'inline-flex items-center justify-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 active:scale-95 select-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50';

const SIZES: Record<IconButtonSize, string> = {
  sm: 'h-9 w-9',
  md: 'h-11 w-11', // 44px: área táctil mínima (UI Spec §6)
};

const VARIANTS: Record<IconButtonVariant, string> = {
  overlay:
    'bg-corporate/70 text-neutral-white hover:bg-corporate focus-visible:ring-neutral-white/80',
  light:
    'bg-neutral-white text-neutral-dark border border-neutral-light shadow-card hover:bg-neutral-lightest focus-visible:ring-action/50',
  ghost: 'text-neutral-dark hover:bg-neutral-light/60 focus-visible:ring-action/50',
};

/**
 * Botón circular de un solo ícono (flechas de carrusel, cierres, acciones
 * compactas). El ícono se pasa como `children` y debe ser decorativo.
 */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ variant = 'light', size = 'md', type = 'button', className = '', children, ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={`${BASE} ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      <span aria-hidden="true" className="flex items-center justify-center">
        {children}
      </span>
    </button>
  )
);

IconButton.displayName = 'IconButton';
