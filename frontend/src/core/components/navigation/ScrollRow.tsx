'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { IconButton } from '../buttons/IconButton';

export interface ScrollRowProps {
  /** Nombre accesible de la región desplazable (p. ej. "Productos destacados"). */
  ariaLabel: string;
  /** Cada hijo debería llevar `shrink-0 snap-start` y un ancho fijo. */
  children: ReactNode;
  className?: string;
}

/**
 * Fila horizontal con desplazamiento por "snap" y flechas. Las flechas solo
 * aparecen cuando hay contenido fuera de vista; en pantallas táctiles el
 * usuario desliza con el dedo. La región es enfocable para que el teclado
 * pueda desplazarla (WCAG 2.1.1).
 */
export function ScrollRow({ ariaLabel, children, className = '' }: ScrollRowProps) {
  const pista = useRef<HTMLDivElement>(null);
  const [puede, setPuede] = useState({ anterior: false, siguiente: false });

  const medir = useCallback(() => {
    const el = pista.current;
    if (!el) return;
    const maximo = el.scrollWidth - el.clientWidth;
    setPuede({ anterior: el.scrollLeft > 4, siguiente: el.scrollLeft < maximo - 4 });
  }, []);

  useEffect(() => {
    const el = pista.current;
    if (!el) return;
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    el.addEventListener('scroll', medir, { passive: true });
    return () => {
      observador.disconnect();
      el.removeEventListener('scroll', medir);
    };
  }, [medir]);

  const desplazar = (sentido: 1 | -1) => {
    const el = pista.current;
    if (!el) return;
    const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ left: sentido * el.clientWidth * 0.9, behavior: sinMovimiento ? 'auto' : 'smooth' });
  };

  return (
    <div className={`relative ${className}`}>
      <div
        ref={pista}
        role="region"
        aria-label={ariaLabel}
        tabIndex={0}
        className="flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth rounded-card px-1 pb-4 pt-1 [scrollbar-width:thin] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50"
      >
        {children}
      </div>

      {puede.anterior && (
        <IconButton
          variant="light"
          aria-label="Ver elementos anteriores"
          className="absolute left-2 top-1/2 -translate-y-1/2"
          onClick={() => desplazar(-1)}
        >
          <ChevronLeft className="h-5 w-5" />
        </IconButton>
      )}
      {puede.siguiente && (
        <IconButton
          variant="light"
          aria-label="Ver más elementos"
          className="absolute right-2 top-1/2 -translate-y-1/2"
          onClick={() => desplazar(1)}
        >
          <ChevronRight className="h-5 w-5" />
        </IconButton>
      )}
    </div>
  );
}
