'use client';

import React from 'react';
import { Check } from 'lucide-react';

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  error?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ id, label, error, checked, disabled, className = '', onChange, ...props }, ref) => {
    const checkboxId =
      id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="flex flex-col">
        <label
          htmlFor={checkboxId}
          className={`inline-flex items-start gap-2.5 select-none ${
            disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
          }`}
        >
          <div className="relative flex items-center justify-center mt-0.5 shrink-0">
            <input
              ref={ref}
              id={checkboxId}
              type="checkbox"
              checked={checked}
              disabled={disabled}
              onChange={onChange}
              className="peer sr-only"
              {...props}
            />

            {/* Caja visual personalizada del checkbox */}
            <div
              className={`
                w-5 h-5 rounded-[4px] border transition-all duration-200 flex items-center justify-center
                peer-focus-visible:ring-2 peer-focus-visible:ring-action/40
                ${
                  checked
                    ? 'bg-action border-action text-neutral-white'
                    : 'bg-neutral-white border-neutral-light hover:border-action/60'
                }
                ${error ? 'border-danger' : ''}
                ${disabled ? 'bg-neutral-light border-neutral-light text-neutral-medium' : ''}
                ${className}
              `}
            >
              {checked && <Check className="w-3.5 h-3.5 stroke-[3]" aria-hidden="true" />}
            </div>
          </div>

          {label && (
            <span className="text-sm font-sans text-neutral-dark leading-snug">
              {label}
            </span>
          )}
        </label>

        {error && <p className="text-xs text-danger mt-1 font-sans">{error}</p>}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
