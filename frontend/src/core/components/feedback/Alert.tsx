import type { ReactNode } from 'react';
import { CircleAlert, CircleCheck, Clock, Info, type LucideIcon } from 'lucide-react';

export type AlertVariant = 'success' | 'info' | 'warning' | 'error' | 'timer';

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
  className?: string;
}

const ESTILOS: Record<AlertVariant, { caja: string; icono: LucideIcon }> = {
  success: { caja: 'border-conversion bg-conversion/10 text-conversion-hover', icono: CircleCheck },
  timer: { caja: 'border-conversion bg-conversion/10 text-conversion-hover', icono: Clock },
  info: { caja: 'border-action bg-subaction text-corporate', icono: Info },
  warning: { caja: 'border-highlight bg-highlight/15 text-neutral-black', icono: CircleAlert },
  error: { caja: 'border-danger bg-danger-subtle text-danger-hover', icono: CircleAlert },
};

/**
 * Aviso en línea (feedback de formularios y estados). `error` se anuncia de
 * inmediato (`role="alert"`); el resto, de forma cortés (`role="status"`).
 */
export function Alert({ variant = 'info', title, children, className = '' }: AlertProps) {
  const { caja, icono: Icono } = ESTILOS[variant];
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-card border-l-4 px-4 py-3 font-sans text-sm ${caja} ${className}`}
    >
      <Icono className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="flex flex-col gap-0.5">
        {title && <p className="font-title font-semibold">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  );
}
