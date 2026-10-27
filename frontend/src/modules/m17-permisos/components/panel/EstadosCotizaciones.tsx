import React from 'react';
import Link from 'next/link';
import type { EstadoCotizacionPanel } from '../../dtos/m17-panel-resumen.dto';
import { formatoEntero, formatoPorcentaje, tramosDeEstado, type TramoEstado } from '../../services/panel-formato';

/** Color de cada tramo: amarillo = esperando al equipo; verde = respondida; azul = aceptada; rojo = rechazada; gris = vencida. */
const COLOR: Record<TramoEstado['clave'], { barra: string; punto: string }> = {
  revision: { barra: 'bg-highlight', punto: 'bg-highlight' },
  respondidas: { barra: 'bg-conversion', punto: 'bg-conversion' },
  aceptadas: { barra: 'bg-action', punto: 'bg-action' },
  rechazadas: { barra: 'bg-danger', punto: 'bg-danger' },
  vencidas: { barra: 'bg-neutral-medium', punto: 'bg-neutral-medium' },
};

export interface EstadosCotizacionesProps {
  porEstado: ReadonlyArray<{ estado: EstadoCotizacionPanel; total: number }>;
  tasaAprobacion: number | null;
}

/** En qué estado quedaron las cotizaciones del periodo: una barra apilada y la lista con enlace a cada estado. */
export const EstadosCotizaciones: React.FC<EstadosCotizacionesProps> = ({ porEstado, tasaAprobacion }) => {
  const tramos = tramosDeEstado(porEstado);
  const total = tramos.reduce((s, t) => s + t.total, 0);
  return (
    <div className="space-y-3">
      <div
        role="img"
        aria-label={total === 0 ? 'Sin cotizaciones en el periodo' : tramos.filter((t) => t.total > 0).map((t) => `${t.etiqueta}: ${t.total}`).join(', ')}
        className="flex h-3 overflow-hidden rounded-full bg-neutral-lightest"
      >
        {tramos
          .filter((t) => t.total > 0)
          .map((t) => (
            <span key={t.clave} className={COLOR[t.clave].barra} style={{ width: `${t.porcentaje}%` }} />
          ))}
      </div>
      <ul className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
        {tramos.map((t) => (
          <li key={t.clave}>
            <Link
              href={`/admin/cotizaciones?estado=${t.estado}`}
              className="flex min-h-[40px] items-center gap-2 rounded-btn px-1 font-sans text-sm text-neutral-dark hover:bg-neutral-lightest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50"
            >
              <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${COLOR[t.clave].punto}`} />
              <span className="flex-1">{t.etiqueta}</span>
              <span className="font-semibold text-corporate">{formatoEntero(t.total)}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="font-sans text-xs text-neutral-medium">
        {tasaAprobacion === null
          ? 'Todavía no hay cotizaciones resueltas para calcular cuántas se aceptan.'
          : `De las cotizaciones ya resueltas, ${formatoPorcentaje(tasaAprobacion)} fueron aceptadas.`}
      </p>
    </div>
  );
};
