'use client';

import React from 'react';
import { Home } from 'lucide-react';
import type { ColorPaleta } from '../../dtos/m01-catalogo-paleta.dto';
import { colorDeTexto } from '../../services/contraste';

export interface AmbientesColorProps {
  /** El color elegido en el abanico; null si todavía no hay. */
  color: ColorPaleta | null;
}

/**
 * Pestaña «En tu espacio» (contrato M01 · P6): el espacio reservado para ver el color en ambientes. La visualización la
 * construye M03; cuando esté lista reemplaza ESTE componente y recibe el mismo color. Mientras tanto avisa que viene.
 */
export const AmbientesColor: React.FC<AmbientesColorProps> = ({ color }) => (
  <div data-testid="ambientes-color" className="flex flex-col items-center gap-3 rounded-card border border-dashed border-neutral-light bg-neutral-lightest px-6 py-10 text-center">
    <span
      aria-hidden="true"
      className="flex h-14 w-14 items-center justify-center rounded-full border border-neutral-light"
      style={{ background: color?.hexadecimal ?? '#FFFFFF', color: color === null ? '#6B7280' : colorDeTexto(color.hexadecimal) }}
    >
      <Home className="h-7 w-7" />
    </span>
    <p className="font-title text-base font-semibold text-corporate">Muy pronto podrás ver este color en tus espacios</p>
    <p className="max-w-sm font-sans text-sm text-neutral-medium">
      {color === null
        ? 'Elige un color en el abanico y aquí lo verás en una habitación o en una fachada.'
        : `Estamos preparando la vista de ${color.nombre} en habitaciones y fachadas.`}
    </p>
  </div>
);
