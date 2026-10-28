'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginacionPedidosProps {
  pagina: number;
  totalPaginas: number;
  onCambiar: (pagina: number) => void;
}

/** Páginas visibles: la actual y sus vecinas, con la primera y la última como atajo. */
function paginasVisibles(pagina: number, total: number): number[] {
  const conjunto = new Set([1, total, pagina - 1, pagina, pagina + 1]);
  return [...conjunto].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
}

const BOTON =
  'flex h-8 min-w-8 items-center justify-center rounded-btn border px-2 font-title text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50';

export function PaginacionPedidos({ pagina, totalPaginas, onCambiar }: PaginacionPedidosProps) {
  if (totalPaginas <= 1) return null;

  return (
    <nav aria-label="Paginación de pedidos" className="flex items-center justify-center gap-1.5">
      <button
        type="button"
        aria-label="Página anterior"
        disabled={pagina <= 1}
        onClick={() => onCambiar(pagina - 1)}
        className={`${BOTON} border-neutral-light bg-neutral-white text-neutral-dark hover:border-action disabled:cursor-not-allowed disabled:text-neutral-medium disabled:opacity-60`}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </button>
      {paginasVisibles(pagina, totalPaginas).map((p, indice, lista) => (
        <span key={p} className="flex items-center gap-1.5">
          {indice > 0 && p - (lista[indice - 1] ?? p) > 1 && (
            <span aria-hidden="true" className="text-neutral-medium">
              …
            </span>
          )}
          <button
            type="button"
            aria-label={`Página ${p}`}
            aria-current={p === pagina ? 'page' : undefined}
            onClick={() => onCambiar(p)}
            className={`${BOTON} ${
              p === pagina
                ? 'border-action bg-action text-neutral-white'
                : 'border-neutral-light bg-neutral-white text-neutral-dark hover:border-action'
            }`}
          >
            {p}
          </button>
        </span>
      ))}
      <button
        type="button"
        aria-label="Página siguiente"
        disabled={pagina >= totalPaginas}
        onClick={() => onCambiar(pagina + 1)}
        className={`${BOTON} border-neutral-light bg-neutral-white text-neutral-dark hover:border-action disabled:cursor-not-allowed disabled:text-neutral-medium disabled:opacity-60`}
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </nav>
  );
}
