import React from 'react';

export interface AdminPageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  metaPrimary?: React.ReactNode;
  metaSecondary?: React.ReactNode;
  actions?: React.ReactNode;
}

/**
 * Encabezado canónico de las vistas del panel administrativo (UI Spec §2.1, §2.2).
 * Centraliza la jerarquía H1 (`Poppins Bold`, `text-corporate`) y el bloque
 * informativo o de acciones a la derecha para evitar duplicación entre módulos.
 */
export const AdminPageHeader: React.FC<AdminPageHeaderProps> = ({
  title,
  subtitle,
  metaPrimary,
  metaSecondary,
  actions,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
      <div>
        <h1 className="font-title font-bold text-2xl sm:text-3xl text-corporate tracking-tight flex items-center gap-2">
          {title}
        </h1>
        {subtitle && (
          <p className="font-sans text-xs sm:text-sm text-neutral-medium mt-1">
            {subtitle}
          </p>
        )}
      </div>

      {(metaPrimary || metaSecondary || actions) && (
        <div className="flex flex-col sm:items-end justify-center shrink-0">
          {actions}
          {metaPrimary && (
            <p className="font-sans text-xs sm:text-sm text-neutral-medium">
              {metaPrimary}
            </p>
          )}
          {metaSecondary && (
            <p className="font-sans text-xs text-neutral-medium mt-0.5">
              {metaSecondary}
            </p>
          )}
        </div>
      )}
    </div>
  );
};