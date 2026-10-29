import React from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { textoVariacion } from '../services/formato-reportes';

/** Una cifra grande con su comparación contra el periodo anterior (flecha, color y texto: nunca solo el color). */
export const Indicador: React.FC<{ titulo: string; valor: string; variacion?: number | null; nota?: string }> = ({ titulo, valor, variacion, nota }) => {
  const Icono = variacion === undefined || variacion === null || variacion === 0 ? Minus : variacion > 0 ? ArrowUpRight : ArrowDownRight;
  const color = variacion === undefined || variacion === null || variacion === 0 ? 'text-neutral-medium' : variacion > 0 ? 'text-conversion-hover' : 'text-danger';
  return (
    <div className="rounded-card border border-neutral-light bg-neutral-white p-4 shadow-card">
      <p className="font-sans text-xs font-medium uppercase tracking-wide text-neutral-medium">{titulo}</p>
      <p className="mt-1 font-title text-2xl font-bold text-corporate">{valor}</p>
      {variacion !== undefined && (
        <p className={`mt-1 flex items-center gap-1 font-sans text-xs font-medium ${color}`}>
          <Icono className="h-4 w-4" aria-hidden="true" />
          {textoVariacion(variacion)} <span className="font-normal text-neutral-medium">frente al periodo anterior</span>
        </p>
      )}
      {nota !== undefined && <p className="mt-1 font-sans text-xs text-neutral-medium">{nota}</p>}
    </div>
  );
};
