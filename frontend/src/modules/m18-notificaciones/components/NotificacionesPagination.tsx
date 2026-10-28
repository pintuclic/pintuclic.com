'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/core/components';

/**
 * Copia local del paginador de m17-permisos (AdminPagination.tsx): el
 * aislamiento por módulo impide importar componentes de otro módulo
 * directamente. Si el equipo necesita reutilizarlo entre módulos, debería
 * promoverse a `core/components` en un PR aparte de archivos compartidos.
 */
export interface NotificacionesPaginationProps {
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
  etiquetaItem?: string;
  onCambiarPagina: (nuevaPagina: number) => void;
}

export const NotificacionesPagination: React.FC<NotificacionesPaginationProps> = ({
  total,
  pagina,
  limite,
  totalPaginas,
  etiquetaItem = 'elementos',
  onCambiarPagina,
}) => {
  if (total === 0) return null;

  const inicio = Math.min((pagina - 1) * limite + 1, total);
  const fin = Math.min(pagina * limite, total);

  const paginas: number[] = [];
  const maxBotones = 5;
  let start = Math.max(1, pagina - Math.floor(maxBotones / 2));
  const end = Math.min(totalPaginas, start + maxBotones - 1);
  if (end - start + 1 < maxBotones) {
    start = Math.max(1, end - maxBotones + 1);
  }
  for (let i = start; i <= end; i++) {
    paginas.push(i);
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-neutral-light/60 bg-neutral-white">
      <p className="font-sans text-xs sm:text-sm text-neutral-medium">
        Mostrando <span className="font-semibold text-neutral-dark">{inicio}</span> a{' '}
        <span className="font-semibold text-neutral-dark">{fin}</span> de{' '}
        <span className="font-semibold text-neutral-dark">{total}</span> {etiquetaItem}
      </p>

      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          disabled={pagina <= 1}
          onClick={() => onCambiarPagina(pagina - 1)}
          aria-label="Página anterior"
          className="px-2.5 min-h-[36px]"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {paginas.map((p) => (
          <Button
            key={p}
            type="button"
            variant={p === pagina ? 'primary-action' : 'outline'}
            size="sm"
            onClick={() => onCambiarPagina(p)}
            aria-label={`Página ${p}`}
            aria-current={p === pagina ? 'page' : undefined}
            className="min-w-[36px] min-h-[36px] px-3 text-xs sm:text-sm font-medium"
          >
            {p}
          </Button>
        ))}

        <Button
          variant="outline"
          size="sm"
          disabled={pagina >= totalPaginas}
          onClick={() => onCambiarPagina(pagina + 1)}
          aria-label="Página siguiente"
          className="px-2.5 min-h-[36px]"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
