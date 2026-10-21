'use client';

import React from 'react';

export type BadgeVariant =
  | 'sponsored'
  | 'offer'
  | 'success'
  | 'action'
  | 'neutral';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  icon,
  className = '',
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center gap-1 font-title font-semibold text-xs px-2 py-0.5 rounded-[4px] uppercase tracking-wide select-none';

  const variantStyles: Record<BadgeVariant, string> = {
    sponsored: 'bg-highlight text-neutral-black shadow-xs',
    offer: 'bg-offer text-neutral-white shadow-xs',
    success: 'bg-conversion text-neutral-white shadow-xs',
    action: 'bg-action text-neutral-white shadow-xs',
    neutral: 'bg-neutral-light text-neutral-dark',
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
