import React from 'react';
import Link from 'next/link';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import type { PendientePanel } from '../../dtos/m17-panel-resumen.dto';
import { formatoEntero } from '../../services/panel-formato';

export interface PendientesPanelProps {
  pendientes: readonly PendientePanel[];
}

/** Lo que espera a alguien del equipo, con enlace a la pantalla donde se resuelve. Sin pendientes lo dice con calma. */
export const PendientesPanel: React.FC<PendientesPanelProps> = ({ pendientes }) =>
  pendientes.length === 0 ? (
    <p className="flex items-center gap-2 rounded-card bg-conversion/10 px-3 py-4 font-sans text-sm text-conversion-hover">
      <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span>Todo al día: no hay nada esperando respuesta.</span>
    </p>
  ) : (
    <ul className="space-y-1">
      {pendientes.map((p) => (
        <li key={p.clave}>
          <Link
            href={p.ruta}
            className="flex min-h-[48px] items-center gap-3 rounded-card px-2 py-1.5 hover:bg-neutral-lightest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50"
          >
            <span
              className={`flex h-9 min-w-9 shrink-0 items-center justify-center rounded-full px-2 font-title text-sm font-bold ${
                p.prioridad === 'alta' ? 'bg-danger/10 text-danger' : 'bg-subaction text-action'
              }`}
            >
              {formatoEntero(p.total)}
            </span>
            <span className="flex-1 font-sans text-sm text-neutral-dark">{p.etiqueta}</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-neutral-medium" aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );
