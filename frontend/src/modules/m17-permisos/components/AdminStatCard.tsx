'use client';

import React from 'react';

export interface AdminStatCardProps {
  label: string;
  value: string | number;
  trendText?: string;
  trendType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  iconBgColor?: string; // Tailwind class, e.g. 'bg-subaction text-action'
}

export const AdminStatCard: React.FC<AdminStatCardProps> = ({
  label,
  value,
  trendText,
  trendType = 'positive',
  icon,
  iconBgColor = 'bg-subaction text-action',
}) => {
  const trendColor =
    trendType === 'positive'
      ? 'text-conversion'
      : trendType === 'negative'
      ? 'text-danger'
      : 'text-neutral-medium';

  return (
    <div className="bg-neutral-white border border-neutral-light/70 rounded-card p-5 shadow-card hover:shadow-card-hover transition-all duration-200 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <span className="font-title font-medium text-xs text-neutral-medium uppercase tracking-wider">
          {label}
        </span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconBgColor}`}>
          {icon}
        </div>
      </div>

      <div>
        <p className="font-title font-bold text-2xl lg:text-3xl text-neutral-black tracking-tight">
          {value}
        </p>
        {trendText && (
          <p className={`font-sans text-xs mt-1.5 flex items-center gap-1 ${trendColor}`}>
            {trendText}
          </p>
        )}
      </div>
    </div>
  );
};
