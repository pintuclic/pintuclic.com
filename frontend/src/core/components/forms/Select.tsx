'use client';

import React, { useId } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  options: ReadonlyArray<SelectOption>;
  label?: string;
  /** Mantiene la etiqueta para lectores de pantalla pero la oculta visualmente. */
  hideLabel?: boolean;
  helperText?: string;
  error?: string;
  /**
   * `field` (por defecto): campo completo con borde. `bare`: sin borde ni fondo,
   * para componerlo dentro de otro contenedor (p. ej. el buscador del header).
   */
  appearance?: 'field' | 'bare';
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      id,
      options,
      label,
      hideLabel = false,
      helperText,
      error,
      appearance = 'field',
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const generado = useId();
    const selectId = id ?? generado;
    const helperId = helperText ? `${selectId}-helper` : undefined;
    const errorId = error ? `${selectId}-error` : undefined;

    const estiloCampo = `
      w-full min-h-[44px] appearance-none pl-3.5 pr-9 py-2.5 text-sm font-sans text-neutral-dark
      bg-neutral-white border rounded-input transition-all duration-200 cursor-pointer
      focus:outline-none focus:ring-2 focus:border-action focus:ring-action/20
      disabled:bg-neutral-light/70 disabled:text-neutral-medium disabled:cursor-not-allowed
      ${error ? 'border-danger focus:border-danger focus:ring-danger/20' : 'border-neutral-light hover:border-neutral-medium/60'}
    `;

    const estiloSinBorde = `
      min-h-[44px] appearance-none bg-transparent pl-3 pr-8 text-sm font-title font-medium
      text-neutral-dark cursor-pointer rounded-btn
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50
      disabled:text-neutral-medium disabled:cursor-not-allowed
    `;

    return (
      <div className={appearance === 'bare' ? 'inline-flex flex-col' : 'w-full flex flex-col'}>
        {label && (
          <label
            htmlFor={selectId}
            className={
              hideLabel
                ? 'sr-only'
                : 'font-title font-medium text-sm text-neutral-dark mb-1.5 select-none'
            }
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : helperId}
            className={`${appearance === 'bare' ? estiloSinBorde : estiloCampo} ${className}`}
            {...props}
          >
            {options.map((opcion) => (
              <option key={opcion.value} value={opcion.value}>
                {opcion.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className={`pointer-events-none absolute h-4 w-4 text-neutral-medium ${
              appearance === 'bare' ? 'right-2' : 'right-3'
            }`}
            aria-hidden="true"
          />
        </div>

        {error ? (
          <p id={errorId} className="text-xs text-danger mt-1 font-sans">
            {error}
          </p>
        ) : helperText ? (
          <p id={helperId} className="text-xs text-neutral-medium mt-1 font-sans">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = 'Select';
