'use client';

import React, { useCallback } from 'react';
import { Palette } from 'lucide-react';
import { Button, IconButton } from '@/core/components';
import type { ColorOfrecido } from '../../dtos/m01-catalogo-productos.dto';
import { useCargar } from '../../hooks/useCargar';
import { catalogoPublicoApi } from '../../services/consulta-publica-api';

/** Cuántos colores se ven de entrada; el resto, en la carta completa. */
export const MUESTRAS_A_LA_VISTA = 12;

export interface MuestrasColorProps {
  idProducto: number;
  elegido: ColorOfrecido | null;
  onElegir: (color: ColorOfrecido) => void;
  /** Abre la carta completa (buscador y familias). */
  onVerTodos: () => void;
}

/**
 * Los primeros colores del producto como círculos que se eligen con un toque, y el botón a la carta completa. Pide una
 * sola página pequeña: nunca la carta entera (U3). La usan la ficha y la compra rápida (U8).
 */
export const MuestrasColor: React.FC<MuestrasColorProps> = ({ idProducto, elegido, onElegir, onVerTodos }) => {
  const cargador = useCallback(
    () => catalogoPublicoApi.colores(idProducto, { pagina: 1, limite: MUESTRAS_A_LA_VISTA }),
    [idProducto],
  );
  const { datos, cargando, error } = useCargar(cargador, 'No se pudieron cargar los colores.');
  const colores = datos?.items ?? [];
  const total = datos?.paginacion.total ?? 0;
  // El elegido desde la carta completa puede no estar entre los primeros: se muestra igual, al comienzo.
  const visibles = elegido !== null && !colores.some((c) => c.idColor === elegido.idColor) ? [elegido, ...colores] : colores;

  return (
    <fieldset className="space-y-2">
      <legend className="flex w-full flex-wrap items-baseline justify-between gap-x-3 font-title text-sm font-medium text-neutral-dark">
        <span>
          Color
          <span className="ml-1 font-sans font-normal text-neutral-medium" role="status">
            {elegido === null
              ? '· Elige uno'
              : `· ${elegido.nombre}${elegido.codigo === null ? '' : ` (${elegido.codigo})`}`}
          </span>
        </span>
      </legend>

      {error !== null && <p className="font-sans text-sm text-danger">{error}</p>}
      {cargando && datos === null && <p className="font-sans text-sm text-neutral-medium">Cargando colores…</p>}

      {visibles.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Colores del producto">
          {visibles.map((c) => {
            const activo = elegido?.idColor === c.idColor;
            return (
              <li key={c.idColor}>
                {/* El color es un dato del catálogo, no del tema: por eso va en `style`. */}
                <IconButton
                  variant="ghost"
                  aria-label={`${c.nombre}${c.codigo === null ? '' : `, código ${c.codigo}`}`}
                  aria-pressed={activo}
                  title={c.nombre}
                  onClick={() => onElegir(c)}
                  className={`border border-neutral-light ${activo ? 'ring-2 ring-action ring-offset-2' : 'hover:scale-110'}`}
                  style={{ backgroundColor: c.hexadecimal }}
                >
                  {null}
                </IconButton>
              </li>
            );
          })}
        </ul>
      )}

      {datos !== null && (
        <Button variant="outline" size="sm" leftIcon={<Palette className="h-4 w-4" aria-hidden="true" />} onClick={onVerTodos}>
          {total > colores.length ? `Ver los ${total} colores` : 'Buscar en la carta de colores'}
        </Button>
      )}

      {datos !== null && (
        <p className="font-sans text-xs text-neutral-medium">
          El color puede variar según la pantalla de tu dispositivo y en la vida real.
        </p>
      )}
    </fieldset>
  );
};
