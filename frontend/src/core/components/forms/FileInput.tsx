'use client';

import React, { useId, useRef } from 'react';
import { FileText, Upload, X } from 'lucide-react';

export interface FileInputProps {
  label: string;
  /** Archivo seleccionado (controlado por el formulario). */
  value: File | null;
  onChange: (archivo: File | null) => void;
  /** Tipos aceptados, como en `<input accept>` (p. ej. ".pdf,.jpg,.png"). */
  accept?: string;
  helperText?: string;
  error?: string;
  disabled?: boolean;
  id?: string;
}

function formatoTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Selector de un archivo con la superficie de los campos del Core Kit (radio de
 * input, borde neutral, foco `action`). El `<input type="file">` nativo queda
 * accesible por teclado y lector de pantalla a través de su `<label>`.
 */
export function FileInput({
  label,
  value,
  onChange,
  accept,
  helperText,
  error,
  disabled = false,
  id,
}: FileInputProps) {
  const idGenerado = useId();
  const inputId = id ?? idGenerado;
  const helperId = helperText ? `${inputId}-helper` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const inputRef = useRef<HTMLInputElement>(null);

  const quitar = () => {
    onChange(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span id={`${inputId}-label`} className="font-sans text-sm font-medium text-neutral-dark">
        {label}
      </span>

      {value ? (
        <div
          className={`flex items-center gap-3 rounded-input border bg-neutral-white px-3 py-2.5 ${
            error ? 'border-danger' : 'border-neutral-light'
          }`}
        >
          <FileText className="h-5 w-5 shrink-0 text-action" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-sans text-sm text-neutral-black">{value.name}</span>
            <span className="block font-sans text-xs text-neutral-medium">{formatoTamano(value.size)}</span>
          </span>
          <button
            type="button"
            onClick={quitar}
            disabled={disabled}
            aria-label={`Quitar ${value.name}`}
            className="rounded-btn p-1.5 text-neutral-medium transition-colors hover:bg-neutral-light/50 hover:text-neutral-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-input border border-dashed px-3 py-4 font-sans text-sm font-medium transition-colors focus-within:ring-2 focus-within:ring-action/50 ${
            error ? 'border-danger text-danger' : 'border-neutral-light text-action hover:border-action/60 hover:bg-action/5'
          } ${disabled ? 'cursor-not-allowed opacity-70' : ''}`}
        >
          <Upload className="h-5 w-5" aria-hidden="true" />
          Seleccionar archivo
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={accept}
            disabled={disabled}
            aria-labelledby={`${inputId}-label`}
            aria-describedby={[helperId, errorId].filter(Boolean).join(' ') || undefined}
            aria-invalid={error ? true : undefined}
            onChange={(evento: React.ChangeEvent<HTMLInputElement>) => onChange(evento.target.files?.[0] ?? null)}
            className="sr-only"
          />
        </label>
      )}

      {helperText && !error && (
        <p id={helperId} className="font-sans text-xs text-neutral-medium">
          {helperText}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="font-sans text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
