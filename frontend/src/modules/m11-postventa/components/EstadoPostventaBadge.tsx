'use client';

import React from 'react';
import type { EstadoPostventa } from '../dtos/m11-postventa.dto';
import {
  ETIQUETA_ESTADO_POSTVENTA,
  CLASE_ESTADO_POSTVENTA,
} from '../services/presentacion';

export interface EstadoPostventaBadgeProps {
  estado: EstadoPostventa;
  className?: string;
}

export function EstadoPostventaBadge({
  estado,
  className = '',
}: EstadoPostventaBadgeProps) {
  const etiqueta = ETIQUETA_ESTADO_POSTVENTA[estado] ?? estado;
  const estilo =
    CLASE_ESTADO_POSTVENTA[estado] ??
    'bg-neutral-100 text-neutral-700 border-neutral-300';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${estilo} ${className}`}
    >
      {etiqueta}
    </span>
  );
}
