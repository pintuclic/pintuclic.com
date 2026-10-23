import React from 'react';

export interface TextButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** `action` (azul de enlace, por defecto) o `corporate` (énfasis de marca). */
  tone?: 'action' | 'corporate';
}

const TONOS: Record<NonNullable<TextButtonProps['tone']>, string> = {
  action: 'font-medium text-action',
  corporate: 'font-semibold text-corporate',
};

/**
 * Acción con apariencia de enlace en línea ("¿Olvidaste tu contraseña?", "Crear
 * cuenta", "Reenviar código"). Es un `<button>`: cambia de vista o ejecuta algo
 * sin navegar. Para navegar a otra ruta se usa `Link` o `ButtonLink`.
 */
export const TextButton = React.forwardRef<HTMLButtonElement, TextButtonProps>(
  ({ tone = 'action', type = 'button', className = '', children, ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={`rounded-btn font-sans ${TONOS[tone]} hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50 disabled:cursor-not-allowed disabled:font-medium disabled:text-neutral-medium disabled:no-underline ${className}`}
      {...props}
    >
      {children}
    </button>
  ),
);

TextButton.displayName = 'TextButton';
