import type { ElementType, ReactNode } from 'react';

export interface ContainerProps {
  /** Elemento HTML a renderizar (por defecto `div`). */
  as?: ElementType;
  className?: string;
  children: ReactNode;
}

/**
 * Contenedor de página (UI Spec §2.4): hasta 1536px centrado, 12px laterales en móvil, 16px en escritorio y 24px en
 * pantallas muy anchas. Es la ÚNICA columna de alineación del sitio: el encabezado, el pie y cada página la comparten.
 */
export function Container({ as: Etiqueta = 'div', className = '', children }: ContainerProps) {
  return (
    <Etiqueta className={`mx-auto w-full max-w-[96rem] px-3 md:px-4 2xl:px-6 ${className}`}>{children}</Etiqueta>
  );
}
