'use client';

import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react';

export interface OtpInputProps {
  /** Valor actual (solo dígitos, hasta `length`). */
  value: string;
  onChange: (valor: string) => void;
  length?: number;
  /** Nombre accesible del grupo, p. ej. "Código de verificación". */
  label: string;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

/**
 * Código de un solo uso en casillas individuales (UI Spec §4.2, paso 2):
 * avance automático, retroceso con Backspace, flechas y pegado del código completo.
 */
export function OtpInput({ value, onChange, length = 6, label, error, disabled = false, autoFocus = false }: OtpInputProps) {
  const casillas = useRef<Array<HTMLInputElement | null>>([]);
  const digitos = Array.from({ length }, (_, i) => value[i] ?? '');

  const enfocar = (indice: number) => {
    const destino = casillas.current[Math.max(0, Math.min(length - 1, indice))];
    destino?.focus();
    destino?.select();
  };

  const fijar = (indice: number, digito: string) => {
    const nuevos = [...digitos];
    nuevos[indice] = digito;
    onChange(nuevos.join('').slice(0, length));
  };

  const alEscribir = (indice: number, texto: string) => {
    const soloDigitos = texto.replace(/\D/g, '');
    if (!soloDigitos) {
      fijar(indice, '');
      return;
    }
    if (soloDigitos.length > 1) {
      // Autocompletado del sistema (SMS/correo) que llena varias casillas a la vez.
      const combinado = (digitos.slice(0, indice).join('') + soloDigitos).slice(0, length);
      onChange(combinado);
      enfocar(combinado.length);
      return;
    }
    fijar(indice, soloDigitos);
    enfocar(indice + 1);
  };

  const alPulsar = (indice: number, evento: KeyboardEvent<HTMLInputElement>) => {
    if (evento.key === 'Backspace' && !digitos[indice]) {
      evento.preventDefault();
      fijar(indice - 1, '');
      enfocar(indice - 1);
    } else if (evento.key === 'ArrowLeft') {
      evento.preventDefault();
      enfocar(indice - 1);
    } else if (evento.key === 'ArrowRight') {
      evento.preventDefault();
      enfocar(indice + 1);
    }
  };

  const alPegar = (evento: ClipboardEvent<HTMLInputElement>) => {
    const pegado = evento.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pegado) return;
    evento.preventDefault();
    onChange(pegado);
    enfocar(pegado.length);
  };

  const idError = `${label.replace(/\s+/g, '-').toLowerCase()}-error`;

  return (
    <div className="flex flex-col gap-2">
      <div role="group" aria-label={label} aria-describedby={error ? idError : undefined} className="flex justify-between gap-2">
        {digitos.map((digito, indice) => (
          <input
            key={indice}
            ref={(el) => {
              casillas.current[indice] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete={indice === 0 ? 'one-time-code' : 'off'}
            maxLength={length}
            value={digito}
            disabled={disabled}
            autoFocus={autoFocus && indice === 0}
            aria-label={`Dígito ${indice + 1} de ${length}`}
            aria-invalid={Boolean(error)}
            onChange={(e) => alEscribir(indice, e.target.value)}
            onKeyDown={(e) => alPulsar(indice, e)}
            onPaste={alPegar}
            onFocus={(e) => e.target.select()}
            className={`h-14 w-full min-w-0 max-w-14 rounded-input border bg-neutral-white text-center font-title text-xl font-semibold text-neutral-black transition-all focus:outline-none focus:ring-2 disabled:bg-neutral-light/70 ${
              error ? 'border-danger focus:ring-danger/20' : 'border-neutral-light focus:border-action focus:ring-action/20'
            }`}
          />
        ))}
      </div>
      {error && (
        <p id={idError} className="font-sans text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
