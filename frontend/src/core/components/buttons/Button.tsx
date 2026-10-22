'use client';

import React from 'react';
import { Check } from 'lucide-react';

export type ButtonVariant =
  | 'primary-action'
  | 'primary-conversion'
  | 'selection'
  | 'outline'
  | 'ghost'
  | 'danger';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  selected?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary-action',
      size = 'md',
      isLoading = false,
      selected = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    // Estilos base compartidos (Tokens de UI Spec v1.0)
    const baseStyles =
      'inline-flex items-center justify-center font-title font-medium rounded-btn transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50 select-none cursor-pointer';

    // Tamaños
    const sizeStyles: Record<ButtonSize, string> = {
      sm: 'px-3 py-1.5 text-xs gap-1.5 min-h-[36px]',
      md: 'px-4 py-2.5 text-sm gap-2 min-h-[44px]', // 44px min para área táctil móvil WCAG
      lg: 'px-6 py-3.5 text-base gap-2.5 min-h-[48px]',
    };

    // Variantes cromáticas oficiales
    const variantStyles: Record<ButtonVariant, string> = {
      'primary-action':
        'bg-action text-neutral-white shadow-sm hover:bg-action-hover active:scale-[0.98]',
      'primary-conversion':
        'bg-conversion text-neutral-white shadow-sm hover:bg-conversion-hover active:scale-[0.98]',
      selection: selected
        ? 'bg-subaction text-corporate border-2 border-action shadow-xs font-semibold'
        : 'bg-neutral-white text-neutral-dark border border-neutral-light hover:border-action/50 hover:bg-subaction/30 active:scale-[0.98]',
      outline:
        'bg-neutral-white text-action border border-action hover:bg-action hover:text-neutral-white active:scale-[0.98]',
      ghost:
        'bg-transparent text-neutral-dark hover:bg-neutral-light/60 active:scale-[0.98]',
      danger:
        'bg-danger text-neutral-white shadow-sm hover:bg-danger/90 active:scale-[0.98]',
    };

    // Estado deshabilitado oficial (#E5E7EB fondo, #6B7280 texto, cursor not-allowed)
    const disabledStyles =
      'disabled:bg-neutral-light disabled:text-neutral-medium disabled:border-transparent disabled:shadow-none disabled:cursor-not-allowed disabled:scale-100 disabled:opacity-80';

    const widthStyle = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${disabledStyles} ${widthStyle} ${className}`}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin h-4 w-4 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Cargando...</span>
          </span>
        ) : (
          <>
            {variant === 'selection' && selected && (
              <Check className="h-4 w-4 text-action shrink-0" aria-hidden="true" />
            )}
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            <span>{children}</span>
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
