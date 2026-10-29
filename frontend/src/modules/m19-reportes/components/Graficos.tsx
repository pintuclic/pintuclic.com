import React from 'react';

export interface BarraDato {
  etiqueta: string;
  valor: number;
  /** Texto del detalle (se lee al enfocar o pasar el puntero). */
  detalle: string;
}

/**
 * Barras verticales para series de tiempo. Hechas con HTML y CSS (sin librería): el alto es proporcional al máximo, el
 * gráfico se describe en voz alta con su resumen y cada barra lleva su cifra en `title`. Los números exactos están siempre
 * en la tabla de al lado.
 */
export const GraficoBarras: React.FC<{ datos: ReadonlyArray<BarraDato>; resumen: string; formatoMaximo: (n: number) => string }> = ({ datos, resumen, formatoMaximo }) => {
  const maximo = Math.max(0, ...datos.map((d) => d.valor));
  const marcas = new Set([0, Math.floor((datos.length - 1) / 2), datos.length - 1]);
  return (
    <figure className="space-y-2">
      <div role="img" aria-label={resumen} className="relative flex h-56 items-end gap-px border-b border-l border-neutral-light pl-1 pt-5" data-testid="grafico-barras">
        <span aria-hidden="true" className="absolute left-1 top-0 font-sans text-[11px] text-neutral-medium">
          {formatoMaximo(maximo)}
        </span>
        {datos.map((d, i) => (
          <div key={`${d.etiqueta}-${String(i)}`} className="group relative flex h-full min-w-px flex-1 items-end" title={`${d.etiqueta}: ${d.detalle}`}>
            <div
              className={`w-full rounded-t-sm ${d.valor === 0 ? 'bg-neutral-light' : 'bg-action group-hover:bg-corporate'}`}
              style={{ height: maximo === 0 ? '2px' : `${Math.max(d.valor === 0 ? 0 : 2, (d.valor / maximo) * 100)}%`, minHeight: '2px' }}
            />
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="relative flex justify-between pl-1 font-sans text-[11px] text-neutral-medium">
        {datos.length > 0 && [...marcas].filter((i) => datos[i] !== undefined).map((i) => <span key={i}>{datos[i]?.etiqueta}</span>)}
      </div>
    </figure>
  );
};

export interface BarraHorizontal {
  etiqueta: string;
  valor: number;
  texto: string;
  /** 0 a 100: qué parte del total es. */
  participacion?: number;
}

/** Barras horizontales para rankings: la etiqueta, la barra y la cifra. Todas contra la más grande. */
export const GraficoRanking: React.FC<{ filas: ReadonlyArray<BarraHorizontal>; ariaLabel: string }> = ({ filas, ariaLabel }) => {
  const maximo = Math.max(0, ...filas.map((f) => f.valor));
  return (
    <ul aria-label={ariaLabel} className="space-y-2" data-testid="grafico-ranking">
      {filas.map((f, i) => (
        <li key={`${f.etiqueta}-${String(i)}`} className="grid grid-cols-[minmax(6rem,12rem)_1fr_auto] items-center gap-3 font-sans text-sm">
          <span className="truncate text-neutral-black" title={f.etiqueta}>
            {f.etiqueta}
          </span>
          <span className="h-3 rounded-full bg-neutral-lightest" aria-hidden="true">
            <span className="block h-3 rounded-full bg-action" style={{ width: maximo === 0 ? '0%' : `${Math.max(2, (f.valor / maximo) * 100)}%` }} />
          </span>
          <span className="whitespace-nowrap text-right text-neutral-dark">
            {f.texto}
            {f.participacion !== undefined && <span className="ml-2 text-xs text-neutral-medium">{String(f.participacion).replace('.', ',')} %</span>}
          </span>
        </li>
      ))}
    </ul>
  );
};
