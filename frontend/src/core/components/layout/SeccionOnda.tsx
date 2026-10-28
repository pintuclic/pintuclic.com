import type { ReactNode } from 'react';
import { Container } from './Container';

export interface SeccionOndaProps {
  /** Id del título de la sección (para `aria-labelledby`). */
  tituloId: string;
  children: ReactNode;
  className?: string;
}

/** Borde ondulado estático: una franja blanca que entra en la sección por el borde dado. */
const ONDA_SUPERIOR = 'M0 0H1440V22C1260 54 1080 6 900 22S540 50 360 26S120 8 0 24Z';
const ONDA_INFERIOR = 'M0 48H1440V26C1260 -6 1080 42 900 26S540 -2 360 22S120 40 0 24Z';

function Onda({ lado }: { lado: 'superior' | 'inferior' }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 1440 48"
      preserveAspectRatio="none"
      className={`pointer-events-none absolute inset-x-0 block h-5 w-full fill-neutral-white sm:h-8 lg:h-10 ${
        lado === 'superior' ? 'top-[-1px]' : 'bottom-[-1px]'
      }`}
    >
      <path d={lado === 'superior' ? ONDA_SUPERIOR : ONDA_INFERIOR} />
    </svg>
  );
}

/**
 * Sección de fondo azul de lado a lado con los bordes superior e inferior en ola (estática). Las olas son blancas: el
 * contenido blanco de arriba y de abajo parece continuar dentro del azul. El contenido va en el `Container` del sitio.
 */
export function SeccionOnda({ tituloId, children, className = '' }: SeccionOndaProps) {
  return (
    <section aria-labelledby={tituloId} className={`relative bg-corporate py-14 text-neutral-white sm:py-16 lg:py-20 ${className}`}>
      <Onda lado="superior" />
      <Container>{children}</Container>
      <Onda lado="inferior" />
    </section>
  );
}
