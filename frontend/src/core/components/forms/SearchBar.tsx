'use client';

import { useId } from 'react';
import { Search } from 'lucide-react';
import { Button } from '../buttons/Button';
import { Input } from './Input';
import { Select, type SelectOption } from './Select';

export interface SearchBarProps {
  /** Ruta de destino del formulario (GET): funciona incluso antes de hidratar. */
  action: string;
  placeholder?: string;
  searchLabel?: string;
  categoryLabel?: string;
  /** Si se omite, no se muestra el selector de categoría. */
  categories?: ReadonlyArray<SelectOption>;
  className?: string;
}

/**
 * Buscador destacado (UI Spec §4.1): campo, selector de categoría y botón en un
 * solo contenedor. Es un `<form method="get">` estándar, así que no depende de
 * JavaScript para buscar.
 */
export function SearchBar({
  action,
  placeholder = 'Buscar productos, marcas, categorías...',
  searchLabel = 'Buscar productos',
  categoryLabel = 'Categoría',
  categories,
  className = '',
}: SearchBarProps) {
  const id = useId();

  return (
    <form
      action={action}
      method="get"
      role="search"
      className={`flex w-full items-stretch overflow-hidden rounded-input border border-action bg-neutral-white focus-within:ring-2 focus-within:ring-action/30 ${className}`}
    >
      <div className="min-w-0 flex-1">
        <Input
          id={`${id}-q`}
          name="q"
          type="search"
          appearance="bare"
          aria-label={searchLabel}
          placeholder={placeholder}
          autoComplete="off"
        />
      </div>

      {categories && categories.length > 0 && (
        <div className="hidden items-center border-l border-neutral-light sm:flex">
          <Select
            id={`${id}-categoria`}
            name="categoria"
            appearance="bare"
            label={categoryLabel}
            hideLabel
            options={categories}
          />
        </div>
      )}

      <Button
        type="submit"
        variant="primary-action"
        aria-label="Buscar"
        className="rounded-none! px-4 shadow-none"
      >
        <Search className="h-5 w-5" aria-hidden="true" />
      </Button>
    </form>
  );
}
