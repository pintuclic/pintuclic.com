import type { ReactNode } from 'react';

/**
 * Versión de página completa del modal de acceso (enlace directo, recarga o sin
 * JavaScript): misma superficie, radio y franja de marca que el Modal (UI Spec §4.2).
 */
export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <section className="bg-neutral-light/30 px-4 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-lg overflow-hidden rounded-modal bg-neutral-white shadow-card">
        <div className="h-1.5 w-full bg-brand-rainbow" aria-hidden="true" />
        <div className="p-5 sm:p-8">{children}</div>
      </div>
    </section>
  );
}
