'use client';

import type { ReactNode } from 'react';

export interface OpcionPildora<T extends string> {
  valor: T;
  etiqueta: string;
  icono?: ReactNode;
  /** Cuántos elementos agrupa; se muestra junto a la etiqueta. */
  cantidad?: number;
}

export interface FiltroPildorasProps<T extends string> {
  opciones: ReadonlyArray<OpcionPildora<T>>;
  valor: T;
  onCambiar: (valor: T) => void;
  ariaLabel: string;
}

/** Filtro en píldoras de «Mis pedidos»: el mismo para el cliente y para la bandeja del personal. */
export function FiltroPildoras<T extends string>({ opciones, valor, onCambiar, ariaLabel }: FiltroPildorasProps<T>) {
  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-2">
      {opciones.map((opcion) => {
        const activo = opcion.valor === valor;
        return (
          <button
            key={opcion.valor}
            type="button"
            aria-pressed={activo}
            onClick={() => onCambiar(opcion.valor)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-title text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50 ${
              activo
                ? 'border-action bg-action text-neutral-white'
                : 'border-neutral-light bg-neutral-white text-neutral-dark hover:border-action'
            }`}
          >
            {opcion.icono}
            {opcion.etiqueta}
            {opcion.cantidad !== undefined && (
              <span
                className={`rounded-full px-1.5 text-[11px] leading-5 ${
                  activo ? 'bg-neutral-white/25 text-neutral-white' : 'bg-neutral-lightest text-neutral-medium'
                }`}
              >
                {opcion.cantidad}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
