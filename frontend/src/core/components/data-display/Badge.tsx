'use client';

import React from 'react';

export type BadgeVariant =
  | 'sponsored'
  | 'offer'
  | 'success'
  | 'action'
  | 'neutral'
  | 'danger';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  icon?: React.ReactNode;
  /** Forma de píldora (esquinas totalmente redondeadas), p. ej. "OFERTAS" en la navegación. */
  pill?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  icon,
  pill = false,
  className = '',
  ...props
}) => {
  const baseStyles = `inline-flex items-center gap-1 font-title font-semibold text-xs py-0.5 uppercase tracking-wide select-none ${
    pill ? 'rounded-full px-3' : 'rounded-[4px] px-2'
  }`;

  const variantStyles: Record<BadgeVariant, string> = {
    sponsored: 'bg-highlight text-neutral-black shadow-xs',
    offer: 'bg-offer text-neutral-white shadow-xs',
    success: 'bg-conversion text-neutral-white shadow-xs',
    action: 'bg-action text-neutral-white shadow-xs',
    neutral: 'bg-neutral-light text-neutral-dark',
    danger: 'bg-danger text-neutral-white shadow-xs',
  };

  return (
    <span
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};

Badge.displayName = 'Badge';
