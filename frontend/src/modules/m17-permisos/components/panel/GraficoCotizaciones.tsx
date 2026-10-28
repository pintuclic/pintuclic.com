import React, { useId } from 'react';
import type { PuntoSerie } from '../../dtos/m17-panel-resumen.dto';
import { barrasDeSerie, fechaCorta, formatoEntero, formatoPesosCorto, resumenAccesibleSerie } from '../../services/panel-formato';

const ANCHO = 600;
const ALTO = 140;

export interface GraficoCotizacionesProps {
  serie: readonly PuntoSerie[];
}

/**
 * Cotizaciones creadas por día (contrato M17 · resumen, R4). Barras en SVG (sin librerías): el texto va en HTML para que
 * se lea bien en cualquier pantalla; el gráfico se describe a los lectores de pantalla y cada barra lleva su cifra al pasar
 * el cursor.
 */
export const GraficoCotizaciones: React.FC<GraficoCotizacionesProps> = ({ serie }) => {
  const idDescripcion = useId();
  const { barras, maximo } = barrasDeSerie(serie, ANCHO, ALTO);
  const primero = serie[0];
  const medio = serie[Math.floor(serie.length / 2)];
  const ultimo = serie[serie.length - 1];
  const vacio = serie.every((p) => p.cotizaciones === 0);

  return (
    <figure className="space-y-2">
      <div className="relative">
        <svg
          viewBox={`0 0 ${ANCHO} ${ALTO}`}
          preserveAspectRatio="none"
          role="img"
          aria-labelledby={idDescripcion}
          className="h-36 w-full overflow-visible"
        >
          <title id={idDescripcion}>{resumenAccesibleSerie(serie)}</title>
          {[0.5, 1].map((f) => (
            <line key={f} x1="0" x2={ANCHO} y1={ALTO - ALTO * f} y2={ALTO - ALTO * f} className="stroke-neutral-light" strokeDasharray="3 4" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          ))}
          <line x1="0" x2={ANCHO} y1={ALTO} y2={ALTO} className="stroke-neutral-light" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          {barras.map((b) => (
            <rect key={b.fecha} x={b.x} y={b.y} width={b.ancho} height={b.alto} rx="2" className={b.esHoy ? 'fill-conversion' : 'fill-action'}>
              <title>{`${fechaCorta(b.fecha)}: ${formatoEntero(b.cotizaciones)} ${b.cotizaciones === 1 ? 'cotización' : 'cotizaciones'} · ${formatoPesosCorto(b.valor)}`}</title>
            </rect>
          ))}
        </svg>
        <span aria-hidden="true" className="pointer-events-none absolute left-0 top-0 rounded-sm bg-neutral-white/80 px-1 font-sans text-[10px] text-neutral-medium">
          {formatoEntero(maximo)}
        </span>
        {vacio && (
          <p className="absolute inset-0 flex items-center justify-center font-sans text-sm text-neutral-medium">Todavía no hay cotizaciones en este periodo.</p>
        )}
      </div>
      <figcaption aria-hidden="true" className="flex justify-between font-sans text-[11px] text-neutral-medium">
        <span>{primero === undefined ? '' : fechaCorta(primero.fecha)}</span>
        <span className="hidden sm:inline">{medio === undefined ? '' : fechaCorta(medio.fecha)}</span>
        <span>{ultimo === undefined ? '' : `Hoy, ${fechaCorta(ultimo.fecha)}`}</span>
      </figcaption>
    </figure>
  );
};
