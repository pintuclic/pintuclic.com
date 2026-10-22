import type { ReactNode } from 'react';
import { Footer, Header, Topbar } from '@/core/components';
import { footer, header, topbarItems } from './_data/shell.content';

/**
 * Estructura común de las páginas públicas: topbar, cabecera, contenido y pie.
 * Incluye el enlace "Saltar al contenido" para navegación por teclado (WCAG 2.4.1).
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <a
        href="#contenido"
        className="sr-only rounded-btn bg-action px-4 py-2 font-title text-sm font-medium text-neutral-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:outline-none focus:ring-2 focus:ring-action/50"
      >
        Saltar al contenido
      </a>
      <Topbar items={topbarItems} />
      <Header {...header} />
      <main id="contenido" tabIndex={-1} className="focus:outline-none">
        {children}
      </main>
      <Footer {...footer} />
    </>
  );
}
