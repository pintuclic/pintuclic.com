'use client';

import React, { useEffect } from 'react';
import { Alert, Button } from '@/core/components';
import type { PaginacionApi } from '../interfaces/inventario.interface';

export const MensajeVacio: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="rounded-card border border-dashed border-neutral-light bg-neutral-lightest px-4 py-8 text-center font-sans text-sm text-neutral-medium">
    {children}
  </p>
);

export const Cargando: React.FC = () => (
  <p role="status" className="px-1 py-6 font-sans text-sm text-neutral-medium">
    Cargando…
  </p>
);

export const Paginador: React.FC<{ paginacion: PaginacionApi; onCambiar: (pagina: number) => void }> = ({
  paginacion,
  onCambiar,
}) => {
  if (paginacion.totalPaginas <= 1) return null;
  return (
    <nav aria-label="Paginación" className="flex items-center justify-between gap-3 pt-3">
      <p className="font-sans text-xs text-neutral-medium">
        Página {paginacion.pagina} de {paginacion.totalPaginas} · {paginacion.total} registros
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={paginacion.pagina <= 1}
          onClick={() => onCambiar(paginacion.pagina - 1)}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={paginacion.pagina >= paginacion.totalPaginas}
          onClick={() => onCambiar(paginacion.pagina + 1)}
        >
          Siguiente
        </Button>
      </div>
    </nav>
  );
};

/** Aviso temporal de éxito o error de una acción de la pantalla. */
export interface Aviso {
  tipo: 'success' | 'error';
  texto: string;
}

export const AvisoAccion: React.FC<{ aviso: Aviso | null; onCerrar: () => void }> = ({ aviso, onCerrar }) => {
  useEffect(() => {
    if (aviso === null) return;
    const t = setTimeout(onCerrar, 6000);
    return () => clearTimeout(t);
  }, [aviso, onCerrar]);
  if (aviso === null) return null;
  return (
    <div role="status" aria-live="polite">
      <Alert variant={aviso.tipo}>{aviso.texto}</Alert>
    </div>
  );
};
