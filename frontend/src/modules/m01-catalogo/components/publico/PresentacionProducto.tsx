'use client';

import React from 'react';
import { Badge, Button } from '@/core/components';
import { formatCOP } from '@/core/utils/moneda';
import type { OfertaPublica, VariantePublica } from '../../dtos/m01-catalogo-productos.dto';
import { etiquetaOferta } from '../../services/ofertas-visuales';

export interface PrecioPresentacionProps {
  variante: VariantePublica;
  oferta: OfertaPublica | null;
  /** Texto de rendimiento ("Rinde aprox. …"); null si no aplica. */
  rendimiento?: string | null;
  /** La ficha usa el precio grande; la compra rápida, uno más contenido. */
  tamano?: 'grande' | 'mediano';
}

/** Precio de la presentación elegida, con la oferta en curso y la disponibilidad (ficha y compra rápida). */
export const PrecioPresentacion: React.FC<PrecioPresentacionProps> = ({
  variante,
  oferta,
  rendimiento = null,
  tamano = 'grande',
}) => (
  <div>
    {oferta !== null && (
      <p className="flex items-center gap-2 font-sans text-sm">
        <Badge variant="offer">{etiquetaOferta(oferta.porcentaje)}</Badge>
        <span className="text-neutral-medium">
          <span className="sr-only">Precio anterior </span>
          <s>{formatCOP(oferta.precioAntes)} COP</s>
        </span>
      </p>
    )}
    <p className={`font-title font-bold text-corporate ${tamano === 'grande' ? 'text-3xl' : 'text-2xl'}`}>
      {formatCOP(oferta?.precioConOferta ?? variante.precio)} <span className="text-base font-medium">COP</span>
    </p>
    {oferta !== null && <p className="font-sans text-xs text-neutral-medium">{oferta.nombre}</p>}
    <p className="mt-1 flex items-center gap-2 font-sans text-sm">
      <Badge variant={variante.disponibilidad === 'disponible' ? 'success' : 'neutral'}>
        {variante.disponibilidad === 'disponible' ? 'Disponible' : 'Agotado por ahora'}
      </Badge>
      {rendimiento !== null && <span className="text-neutral-dark">{rendimiento}</span>}
    </p>
  </div>
);

export interface SelectorPresentacionProps {
  variantes: readonly VariantePublica[];
  idElegida: number | null;
  onElegir: (idVariante: number) => void;
}

/** Botones de las presentaciones del producto (galón, cuarto…), uno marcado como elegido. */
export const SelectorPresentacion: React.FC<SelectorPresentacionProps> = ({ variantes, idElegida, onElegir }) => (
  <fieldset className="space-y-2">
    <legend className="font-title text-sm font-medium text-neutral-dark">Presentación</legend>
    <div className="flex flex-wrap gap-2">
      {variantes.map((v) => (
        <Button
          key={v.idVariante}
          variant="selection"
          selected={idElegida === v.idVariante}
          aria-pressed={idElegida === v.idVariante}
          onClick={() => onElegir(v.idVariante)}
          className="rounded-full px-4"
        >
          {v.medida}
        </Button>
      ))}
    </div>
  </fieldset>
);
