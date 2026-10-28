import React from 'react';
import Link from 'next/link';

export interface CifraBloque {
  etiqueta: string;
  valor: string;
  /** Resalta la cifra cuando pide atención (p. ej. presentaciones agotadas). */
  alerta?: boolean;
  /** Variación frente al periodo anterior, ya redactada. */
  variacion?: { texto: string; tipo: 'positive' | 'negative' | 'neutral' };
  href?: string;
}

export interface BloqueCifrasProps {
  id: string;
  titulo: string;
  icono: React.ReactNode;
  colorIcono: string;
  cifras: readonly CifraBloque[];
}

const COLOR_VARIACION = { positive: 'text-conversion-hover', negative: 'text-danger', neutral: 'text-neutral-medium' } as const;

/** Un bloque corto de cifras (catálogo, descuentos, patrocinios, personas): título con ícono y una lista etiqueta → valor. */
export const BloqueCifras: React.FC<BloqueCifrasProps> = ({ id, titulo, icono, colorIcono, cifras }) => (
  <section aria-labelledby={`${id}-titulo`} className="rounded-card border border-neutral-light/70 bg-neutral-white p-5 shadow-card">
    <div className="mb-3 flex items-center gap-3">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-card ${colorIcono}`}>{icono}</span>
      <h2 id={`${id}-titulo`} className="font-title text-sm font-bold text-corporate">
        {titulo}
      </h2>
    </div>
    <dl className="divide-y divide-neutral-light/60">
      {cifras.map((c) => {
        const contenido = (
          <>
            <dt className="font-sans text-xs text-neutral-medium">{c.etiqueta}</dt>
            <dd className="flex items-baseline gap-2">
              {c.variacion !== undefined && <span className={`font-sans text-[11px] font-semibold ${COLOR_VARIACION[c.variacion.tipo]}`}>{c.variacion.texto}</span>}
              <span className={`font-title text-base font-bold ${c.alerta === true ? 'text-danger' : 'text-corporate'}`}>{c.valor}</span>
            </dd>
          </>
        );
        return c.href === undefined ? (
          <div key={c.etiqueta} className="flex min-h-[36px] items-center justify-between gap-3 py-1">
            {contenido}
          </div>
        ) : (
          <Link
            key={c.etiqueta}
            href={c.href}
            className="flex min-h-[36px] items-center justify-between gap-3 rounded-btn py-1 hover:bg-neutral-lightest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50"
          >
            {contenido}
          </Link>
        );
      })}
    </dl>
  </section>
);
