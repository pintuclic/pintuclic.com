import React from 'react';
import type { ProductoCotizado } from '../../dtos/m17-panel-resumen.dto';
import { formatoEntero } from '../../services/panel-formato';

export interface TopProductosProps {
  productos: readonly ProductoCotizado[];
}

/** Los productos con más unidades en las cotizaciones del periodo: lo que la gente está pidiendo. */
export const TopProductos: React.FC<TopProductosProps> = ({ productos }) => {
  if (productos.length === 0) {
    return <p className="rounded-card bg-neutral-lightest px-3 py-6 text-center font-sans text-sm text-neutral-medium">Todavía no hay productos cotizados en este periodo.</p>;
  }
  const maximo = Math.max(1, ...productos.map((p) => p.unidades));
  return (
    <ol className="space-y-3">
      {productos.map((p, i) => (
        <li key={`${p.nombre}-${p.marca ?? ''}`} className="space-y-1">
          <div className="flex items-baseline justify-between gap-3">
            <p className="min-w-0 truncate font-sans text-sm font-medium text-neutral-black">
              <span className="mr-2 font-title text-xs font-bold text-neutral-medium">{i + 1}</span>
              {p.nombre}
              {p.marca !== null && <span className="ml-1 text-xs font-normal text-neutral-medium">· {p.marca}</span>}
            </p>
            <p className="shrink-0 font-sans text-xs text-neutral-medium">
              <strong className="text-sm text-corporate">{formatoEntero(p.unidades)}</strong> {p.unidades === 1 ? 'unidad' : 'unidades'} · {formatoEntero(p.cotizaciones)}{' '}
              {p.cotizaciones === 1 ? 'cotización' : 'cotizaciones'}
            </p>
          </div>
          <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-neutral-lightest">
            <div className="h-full rounded-full bg-action" style={{ width: `${(p.unidades / maximo) * 100}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
};
