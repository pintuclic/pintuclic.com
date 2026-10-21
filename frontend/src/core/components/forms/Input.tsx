'use client';

import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      id,
      label,
      helperText,
      error,
      leftIcon,
      rightIcon,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    const helperId = inputId && helperText ? `${inputId}-helper` : undefined;
    const errorId = inputId && error ? `${inputId}-error` : undefined;

    return (
      <div className="w-full flex flex-col">
        {label && (
          <label
            htmlFor={inputId}
            className="font-title font-medium text-sm text-neutral-dark mb-1.5 select-none"
          >
            {label}
            {props.required && <span className="text-danger ml-0.5">*</span>}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 flex items-center pointer-events-none text-neutral-medium">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : helperId}
            className={`
              w-full min-h-[44px] px-3.5 py-2.5 text-sm font-sans text-neutral-dark bg-neutral-white
              border rounded-input transition-all duration-200 placeholder:text-neutral-medium
              focus:outline-none focus:ring-2 focus:border-action focus:ring-action/20
              disabled:bg-neutral-light/70 disabled:text-neutral-medium disabled:cursor-not-allowed
              ${leftIcon ? 'pl-10' : ''}
              ${rightIcon ? 'pr-10' : ''}
              ${
                error
                  ? 'border-danger focus:border-danger focus:ring-danger/20 text-danger'
                  : 'border-neutral-light hover:border-neutral-medium/60'
              }
              ${className}
            `}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3 flex items-center pointer-events-none text-neutral-medium">
              {rightIcon}
            </div>
          )}
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

Input.displayName = 'Input';
