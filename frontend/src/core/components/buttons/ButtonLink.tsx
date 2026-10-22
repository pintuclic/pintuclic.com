import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { getButtonClassName, type ButtonSize, type ButtonVariant } from './button-styles';

export interface ButtonLinkProps extends Omit<ComponentProps<typeof Link>, 'className'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  className?: string;
}

/**
 * Enlace de navegación con la apariencia canónica de `Button`.
 *
 * Navegar es un enlace (`<a>`), no un botón: se conservan la semántica, el clic
 * medio y "abrir en pestaña nueva", y se reutilizan los mismos estilos.
 */
export function ButtonLink({
  children,
  variant = 'primary-action',
  size = 'md',
  fullWidth = false,
  leftIcon,
  rightIcon,
  className = '',
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={getButtonClassName({ variant, size, fullWidth, className })} {...props}>
      {leftIcon && (
        <span className="shrink-0" aria-hidden="true">
          {leftIcon}
        </span>
      )}
      <span>{children}</span>
      {rightIcon && (
        <span className="shrink-0" aria-hidden="true">
          {rightIcon}
        </span>
      )}
    </Link>
  );
}
