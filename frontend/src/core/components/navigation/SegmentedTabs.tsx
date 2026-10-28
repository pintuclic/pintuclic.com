'use client';

import { useRef, type KeyboardEvent } from 'react';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedTabsProps<T extends string> {
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (valor: T) => void;
  ariaLabel: string;
  /** id del panel que estas pestañas controlan (`role="tabpanel"`). */
  panelId: string;
  idPrefix: string;
}

/**
 * Pestañas segmentadas (mockup de registro: Natural | Empresa). Patrón WAI-ARIA
 * "tabs" con foco itinerante y flechas izquierda/derecha.
 */
export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  panelId,
  idPrefix,
}: SegmentedTabsProps<T>) {
  const botones = useRef<Array<HTMLButtonElement | null>>([]);

  const alPulsar = (indice: number, evento: KeyboardEvent<HTMLButtonElement>) => {
    if (evento.key !== 'ArrowRight' && evento.key !== 'ArrowLeft') return;
    evento.preventDefault();
    const destino = (indice + (evento.key === 'ArrowRight' ? 1 : -1) + options.length) % options.length;
    const opcion = options[destino];
    if (!opcion) return;
    onChange(opcion.value);
    botones.current[destino]?.focus();
  };

  return (
    // `grid-flow-col auto-cols-fr` reparte columnas iguales para cualquier número
    // de pestañas; con `grid-cols-2` la tercera se iba a una segunda fila.
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="grid grid-flow-col auto-cols-fr gap-1 rounded-btn bg-subaction p-1"
    >
      {options.map((opcion, indice) => {
        const activa = opcion.value === value;
        return (
          <button
            key={opcion.value}
            ref={(el) => {
              botones.current[indice] = el;
            }}
            id={`${idPrefix}-tab-${opcion.value}`}
            type="button"
            role="tab"
            aria-selected={activa}
            aria-controls={panelId}
            tabIndex={activa ? 0 : -1}
            onClick={() => onChange(opcion.value)}
            onKeyDown={(e) => alPulsar(indice, e)}
            className={`min-h-[44px] rounded-btn font-title text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50 ${
              activa ? 'bg-neutral-white text-neutral-black shadow-card' : 'text-neutral-medium hover:text-neutral-dark'
            }`}
          >
            {opcion.label}
          </button>
        );
      })}
    </div>
  );
}
