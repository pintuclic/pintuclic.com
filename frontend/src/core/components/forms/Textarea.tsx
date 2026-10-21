'use client';

import React from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      id,
      label,
      helperText,
      error,
      disabled,
      className = '',
      rows = 3,
      ...props
    },
    ref
  ) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    const helperId = textareaId && helperText ? `${textareaId}-helper` : undefined;
    const errorId = textareaId && error ? `${textareaId}-error` : undefined;

    return (
      <div className="w-full flex flex-col">
        {label && (
          <label
            htmlFor={textareaId}
            className="font-title font-medium text-sm text-neutral-dark mb-1.5 select-none"
          >
            {label}
            {props.required && <span className="text-danger ml-0.5">*</span>}
          </label>
        )}

        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : helperId}
          className={`
            w-full px-3.5 py-2.5 text-sm font-sans text-neutral-dark bg-neutral-white
            border rounded-input transition-all duration-200 placeholder:text-neutral-medium
            focus:outline-none focus:ring-2 focus:border-action focus:ring-action/20
            disabled:bg-neutral-light/70 disabled:text-neutral-medium disabled:cursor-not-allowed
            resize-y
            ${
              error
                ? 'border-danger focus:border-danger focus:ring-danger/20 text-danger'
                : 'border-neutral-light hover:border-neutral-medium/60'
            }
            ${className}
          `}
          {...props}
        />

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

Textarea.displayName = 'Textarea';
