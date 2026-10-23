'use client';

import { useEffect, useRef } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface SectionNavItem<T extends string> {
  id: T;
  label: string;
  icon?: LucideIcon;
}

export interface SectionNavProps<T extends string> {
  items: ReadonlyArray<SectionNavItem<T>>;
  value: T;
  onChange: (id: T) => void;
  ariaLabel: string;
  /** `id` del contenedor cuyo contenido cambia al elegir una sección. */
  controlsId?: string;
  className?: string;
}

/**
 * Navegación entre secciones de una misma vista (p. ej. "Mi cuenta"). En móvil es
 * una fila deslizable que mantiene a la vista la sección activa; desde `lg` es una
 * columna lateral. La sección activa se anuncia con `aria-current`.
 */
export function SectionNav<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  controlsId,
  className = '',
}: SectionNavProps<T>) {
  const listaRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    listaRef.current
      ?.querySelector<HTMLElement>('[aria-current="true"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [value]);

  return (
    <nav aria-label={ariaLabel} className={`min-w-0 ${className}`}>
      <ul
        ref={listaRef}
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0"
      >
        {items.map(({ id, label, icon: Icono }) => {
          const activa = value === id;
          return (
            <li key={id} className="shrink-0">
              <button
                type="button"
                aria-current={activa ? 'true' : undefined}
                aria-controls={controlsId}
                onClick={() => onChange(id)}
                className={`flex min-h-11 w-full items-center gap-3 rounded-btn px-3 py-2 text-left font-sans text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50 ${
                  activa
                    ? 'bg-action/10 font-semibold text-action'
                    : 'text-neutral-dark hover:bg-neutral-light/40 hover:text-neutral-black'
                }`}
              >
                {Icono && <Icono className="h-5 w-5 shrink-0" aria-hidden="true" />}
                <span className="whitespace-nowrap">{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
