'use client';

import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  rounded?: 'none' | 'input' | 'btn' | 'card' | 'modal' | 'full';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  rounded = 'card',
  className = '',
  ...props
}) => {
  const roundedStyles: Record<NonNullable<SkeletonProps['rounded']>, string> = {
    none: 'rounded-none',
    input: 'rounded-input',
    btn: 'rounded-btn',
    card: 'rounded-card',
    modal: 'rounded-modal',
    full: 'rounded-full',
  };

  return (
    <div
      aria-hidden="true"
      className={`bg-neutral-light animate-pulse ${roundedStyles[rounded]} ${className}`}
      {...props}
    />
  );
};

export const SkeletonProductCard: React.FC<{ className?: string }> = ({
  className = '',
}) => {
  return (
    <div
      aria-hidden="true"
      className={`
        flex flex-col bg-neutral-white rounded-card shadow-card
        border border-neutral-light/60 overflow-hidden p-0 animate-pulse
        ${className}
      `}
    >
      {/* Contenedor de imagen esqueleto */}
      <div className="w-full h-52 bg-neutral-light/50" />

      {/* Contenido esqueleto */}
      <div className="p-4 flex flex-col flex-1 gap-2.5">
        <div className="h-3 bg-neutral-light rounded w-1/4" />
        <div className="h-4 bg-neutral-light rounded w-4/5" />
        <div className="h-3 bg-neutral-light rounded w-3/4" />

        <div className="mt-4 pt-2">
          <div className="h-6 bg-neutral-light rounded w-1/2 mb-3" />
          <div className="flex items-center gap-2 pt-2 border-t border-neutral-light/50">
            <div className="h-9 bg-neutral-light rounded-btn flex-1" />
            <div className="h-9 w-9 bg-neutral-light rounded-btn shrink-0" />
          </div>
        </div>
      </div>
    </div>
  );
};

Skeleton.displayName = 'Skeleton';
SkeletonProductCard.displayName = 'SkeletonProductCard';
