import React from 'react';

export type BareButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

/**
 * Botón sin ningún estilo propio, para controles totalmente a medida cuyo aspecto lo da quien lo usa (las láminas del
 * abanico de la paleta de color, por ejemplo). Solo aporta lo que todo botón necesita: `type="button"` por omisión y el
 * anillo de foco visible. Para botones de acción normales se usa `Button`; para solo un ícono, `IconButton`.
 */
export const BareButton = React.forwardRef<HTMLButtonElement, BareButtonProps>(
  ({ type = 'button', className = '', children, ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={`cursor-pointer select-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/70 ${className}`}
      {...props}
    >
      {children}
    </button>
  ),
);

BareButton.displayName = 'BareButton';
