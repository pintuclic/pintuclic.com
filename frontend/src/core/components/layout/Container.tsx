import type { ElementType, ReactNode } from 'react';

export interface ContainerProps {
  /** Elemento HTML a renderizar (por defecto `div`). */
  as?: ElementType;
  className?: string;
  children: ReactNode;
}

/**
 * Contenedor de página (UI Spec §2.4): `max-w-7xl` centrado, 24px laterales en
 * escritorio y 16px en móvil. Es la ÚNICA columna de alineación del sitio.
 */
export function Container({ as: Etiqueta = 'div', className = '', children }: ContainerProps) {
  return (
    <Etiqueta className={`mx-auto w-full max-w-7xl px-4 md:px-6 ${className}`}>{children}</Etiqueta>
  );
}
