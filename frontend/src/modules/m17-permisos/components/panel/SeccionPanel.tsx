import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export interface SeccionPanelProps {
  id: string;
  titulo: string;
  descripcion?: string;
  /** Enlace «Ver …» a la pantalla donde se trabaja con esto. */
  enlace?: { texto: string; href: string };
  className?: string;
  children: React.ReactNode;
}

/** Tarjeta con título para cada bloque del panel; el enlace lleva a la pantalla de trabajo, ya filtrada. */
export const SeccionPanel: React.FC<SeccionPanelProps> = ({ id, titulo, descripcion, enlace, className = '', children }) => (
  <section aria-labelledby={`${id}-titulo`} className={`rounded-card border border-neutral-light/70 bg-neutral-white p-5 shadow-card ${className}`}>
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 id={`${id}-titulo`} className="font-title text-base font-bold text-corporate">
          {titulo}
        </h2>
        {descripcion !== undefined && <p className="mt-0.5 font-sans text-xs text-neutral-medium">{descripcion}</p>}
      </div>
      {enlace !== undefined && (
        <Link href={enlace.href} className="inline-flex min-h-[44px] shrink-0 items-center gap-1 rounded-btn px-1 font-sans text-xs font-semibold text-action hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50">
          <span>{enlace.texto}</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      )}
    </div>
    {children}
  </section>
);
