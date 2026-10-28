'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { IconButton } from '../buttons/IconButton';

export interface CarouselProps {
  slides: ReadonlyArray<ReactNode>;
  /** Nombre accesible del carrusel (p. ej. "Banners destacados"). */
  ariaLabel: string;
  /** Avance automático en ms. Se pausa con el puntero/foco y se desactiva con `prefers-reduced-motion`. */
  autoPlayMs?: number;
  className?: string;
}

/**
 * Carrusel accesible (patrón WAI-ARIA "carousel"): flechas, puntos de navegación,
 * diapositivas fuera de vista marcadas `inert`. Con una sola diapositiva no
 * muestra controles.
 */
export function Carousel({ slides, ariaLabel, autoPlayMs, className = '' }: CarouselProps) {
  const total = slides.length;
  const [actual, setActual] = useState(0);
  const [pausado, setPausado] = useState(false);

  const ir = useCallback(
    (destino: number) => setActual(((destino % total) + total) % total),
    [total]
  );

  useEffect(() => {
    if (!autoPlayMs || total < 2 || pausado) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const temporizador = window.setInterval(() => setActual((i) => (i + 1) % total), autoPlayMs);
    return () => window.clearInterval(temporizador);
  }, [autoPlayMs, total, pausado]);

  if (total === 0) return null;

  const conControles = total > 1;

  return (
    <section
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      className={`relative overflow-hidden ${className}`}
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocusCapture={() => setPausado(true)}
      onBlurCapture={() => setPausado(false)}
    >
      <div
        className="flex h-full transition-transform duration-500 ease-in-out motion-reduce:transition-none"
        style={{ transform: `translateX(-${actual * 100}%)` }}
        aria-live={autoPlayMs && !pausado ? 'off' : 'polite'}
      >
        {slides.map((slide, indice) => (
          <div
            key={indice}
            role="group"
            aria-roledescription="slide"
            aria-label={`${indice + 1} de ${total}`}
            aria-hidden={indice !== actual}
            inert={indice !== actual}
            className="h-full w-full shrink-0 grow-0 basis-full"
          >
            {slide}
          </div>
        ))}
      </div>

      {conControles && (
        <>
          <IconButton
            variant="overlay"
            aria-label="Diapositiva anterior"
            className="absolute left-1.5 top-1/2 -translate-y-1/2 sm:left-2 md:left-2.5 z-20"
            onClick={() => ir(actual - 1)}
          >
            <ChevronLeft className="h-5 w-5" />
          </IconButton>
          <IconButton
            variant="overlay"
            aria-label="Diapositiva siguiente"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 sm:right-2 md:right-2.5 z-20"
            onClick={() => ir(actual + 1)}
          >
            <ChevronRight className="h-5 w-5" />
          </IconButton>

          <div
            role="group"
            aria-label="Seleccionar diapositiva"
            className="absolute inset-x-0 bottom-1 flex justify-center"
          >
            {slides.map((_, indice) => (
              <button
                key={indice}
                type="button"
                aria-label={`Ir a la diapositiva ${indice + 1}`}
                aria-current={indice === actual}
                onClick={() => ir(indice)}
                className="rounded-full p-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-white/80"
              >
                <span
                  className={`block h-2 w-2 rounded-full transition-colors ${
                    indice === actual ? 'bg-neutral-white' : 'bg-neutral-white/50'
                  }`}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
