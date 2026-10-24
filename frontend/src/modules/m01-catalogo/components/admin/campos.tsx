'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { Check, ChevronDown, X } from 'lucide-react';
import { Checkbox } from '@/core/components';
import { filtrarOpciones, type OpcionBuscable } from '../../services/busqueda';

/**
 * Casilla ligada a react-hook-form. El Checkbox del Core Kit pinta la marca según `checked`,
 * así que no sirve con `register` (no controlado): aquí el valor se controla con `Controller`.
 */
export function CampoCheck<T extends FieldValues>({
  control,
  name,
  label,
}: {
  control: Control<T>;
  name: FieldPath<T>;
  label: React.ReactNode;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Checkbox
          id={`campo-${name}`}
          label={label}
          checked={field.value === true}
          onChange={(e) => field.onChange(e.target.checked)}
          onBlur={field.onBlur}
          name={field.name}
          ref={field.ref}
        />
      )}
    />
  );
}

export interface SelectorBuscableProps {
  label: string;
  value: string;
  onChange: (valor: string) => void;
  options: readonly OpcionBuscable[];
  /** Texto cuando no hay nada elegido. */
  placeholder?: string;
  disabled?: boolean;
  error?: string | undefined;
  helperText?: string | undefined;
  /** Permite volver a "sin elegir"; el texto es el de la opción que lo hace. */
  textoSinElegir?: string;
}

/**
 * Lista desplegable con buscador: se escribe para filtrar y se elige con el ratón o el teclado
 * (flechas, Enter, Escape). Es el selector para todo lo nuevo que tenga más de unas pocas opciones.
 */
export const SelectorBuscable: React.FC<SelectorBuscableProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder = 'Elija…',
  disabled = false,
  error,
  helperText,
  textoSinElegir,
}) => {
  const id = useId();
  const idLista = `${id}-lista`;
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState('');
  const [activa, setActiva] = useState(0);
  const contenedor = useRef<HTMLDivElement>(null);
  const elegida = options.find((o) => o.value === value) ?? null;

  const visibles = useMemo(() => {
    const filtradas = filtrarOpciones(options, texto);
    return textoSinElegir !== undefined && texto.trim() === ''
      ? [{ value: '', label: textoSinElegir }, ...filtradas]
      : filtradas;
  }, [options, texto, textoSinElegir]);

  useEffect(() => {
    if (!abierto) return;
    const cerrarFuera = (e: PointerEvent) => {
      if (contenedor.current !== null && e.target instanceof Node && !contenedor.current.contains(e.target)) {
        setAbierto(false);
        setTexto('');
      }
    };
    document.addEventListener('pointerdown', cerrarFuera);
    return () => document.removeEventListener('pointerdown', cerrarFuera);
  }, [abierto]);

  const elegir = (valor: string) => {
    onChange(valor);
    setAbierto(false);
    setTexto('');
  };

  const alPulsar = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!abierto) {
        setAbierto(true);
        return;
      }
      const paso = e.key === 'ArrowDown' ? 1 : -1;
      setActiva((a) => (visibles.length === 0 ? 0 : (a + paso + visibles.length) % visibles.length));
    } else if (e.key === 'Enter' && abierto) {
      e.preventDefault();
      const opcion = visibles[activa];
      if (opcion !== undefined) elegir(opcion.value);
    } else if (e.key === 'Escape' && abierto) {
      e.stopPropagation();
      setAbierto(false);
      setTexto('');
    }
  };

  return (
    <div ref={contenedor} className="relative w-full">
      <label htmlFor={id} className="mb-1.5 block select-none font-title text-sm font-medium text-neutral-dark">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={abierto}
          aria-controls={idLista}
          aria-autocomplete="list"
          aria-invalid={error !== undefined}
          aria-activedescendant={abierto && visibles[activa] !== undefined ? `${id}-op-${activa}` : undefined}
          autoComplete="off"
          disabled={disabled}
          value={abierto ? texto : (elegida?.label ?? '')}
          placeholder={abierto ? 'Escriba para buscar…' : placeholder}
          onFocus={() => !disabled && setAbierto(true)}
          onClick={() => !disabled && setAbierto(true)}
          onChange={(e) => {
            setTexto(e.target.value);
            setActiva(0);
            setAbierto(true);
          }}
          onKeyDown={alPulsar}
          className={`min-h-[44px] w-full rounded-input border bg-neutral-white py-2.5 pl-3.5 pr-16 font-sans text-sm text-neutral-dark transition-all duration-200 placeholder:text-neutral-medium focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20 disabled:cursor-not-allowed disabled:bg-neutral-light/70 disabled:text-neutral-medium ${
            error !== undefined ? 'border-danger' : 'border-neutral-light hover:border-neutral-medium/60'
          }`}
        />
        <span className="absolute inset-y-0 right-2 flex items-center gap-1">
          {value !== '' && !disabled && textoSinElegir !== undefined && (
            <button
              type="button"
              aria-label={`Quitar ${label.toLowerCase()}`}
              onClick={() => elegir('')}
              className="rounded-full p-1 text-neutral-medium hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          <ChevronDown className="pointer-events-none h-4 w-4 text-neutral-medium" aria-hidden="true" />
        </span>
      </div>
      {abierto && (
        <ul
          id={idLista}
          role="listbox"
          aria-label={label}
          className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-card border border-neutral-light bg-neutral-white py-1 shadow-card"
        >
          {visibles.length === 0 && (
            <li className="px-3.5 py-2 font-sans text-sm text-neutral-medium">Sin resultados</li>
          )}
          {visibles.map((o, i) => (
            <li
              key={o.value === '' ? 'sin-elegir' : o.value}
              id={`${id}-op-${i}`}
              role="option"
              aria-selected={o.value === value}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => elegir(o.value)}
              onMouseEnter={() => setActiva(i)}
              className={`flex min-h-10 cursor-pointer items-center justify-between gap-2 px-3.5 py-2 font-sans text-sm ${
                i === activa ? 'bg-subaction text-corporate' : 'text-neutral-dark'
              }`}
            >
              <span>
                {o.label}
                {o.detalle !== undefined && <span className="ml-2 text-xs text-neutral-medium">{o.detalle}</span>}
              </span>
              {o.value === value && o.value !== '' && <Check className="h-4 w-4 text-action" aria-hidden="true" />}
            </li>
          ))}
        </ul>
      )}
      {error !== undefined && <p className="mt-1 font-sans text-xs text-danger">{error}</p>}
      {error === undefined && helperText !== undefined && (
        <p className="mt-1 font-sans text-xs text-neutral-medium">{helperText}</p>
      )}
    </div>
  );
};
