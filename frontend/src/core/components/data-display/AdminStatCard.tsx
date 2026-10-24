'use client';

import React from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';

export interface AdminStatCardProps {
  label: string;
  value: string | number;
  trendText?: string;
  trendSubtext?: string;
  trendType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  iconBgColor?: string;
}

/**
 * Tarjeta KPI canónica del panel administrativo (Mockup oficial y UI Spec §2.1, §2.5).
 * Ícono a la izquierda del título en la fila superior, cifra principal en azul
 * corporativo (`#002855`) y pastilla de estado/tendencia al pie.
 */
export const AdminStatCard: React.FC<AdminStatCardProps> = ({
  label,
  value,
  trendText,
  trendSubtext,
  trendType = 'positive',
  icon,
  iconBgColor = 'bg-subaction text-action',
}) => {
  const badgeClasses =
    trendType === 'positive'
      ? 'bg-conversion/15 text-conversion-hover'
      : trendType === 'negative'
      ? 'bg-danger/10 text-danger'
      : 'bg-neutral-lightest text-neutral-medium';

  return (
    <div className="bg-neutral-white border border-neutral-light/70 rounded-card p-5 shadow-card hover:shadow-card-hover transition-all duration-200 flex flex-col justify-between">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-card flex items-center justify-center shrink-0 ${iconBgColor}`}>
          {icon}
        </div>
        <span className="font-title font-semibold text-sm text-corporate leading-snug">
          {label}
        </span>
      </div>

      <div>
        <p className="font-title font-bold text-2xl lg:text-3xl text-corporate tracking-tight">
          {value}
        </p>
        {trendText && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-sans text-[11px] font-semibold ${badgeClasses}`}
            >
              {trendType === 'positive' && <ArrowUp className="w-3 h-3 shrink-0" aria-hidden="true" />}
              {trendType === 'negative' && <ArrowDown className="w-3 h-3 shrink-0" aria-hidden="true" />}
              <span>{trendText}</span>
            </span>
            {trendSubtext && (
              <span className="font-sans text-[11px] text-neutral-medium">{trendSubtext}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};