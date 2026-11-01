'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { CalendarDays } from 'lucide-react';
import { Button, Input, Select } from '@/core/components';
import {
  PERIODOS_RAPIDOS,
  SIN_PERIODO,
  mesCompleto,
  mesDe,
  periodoRapidoDe,
  rangoDePeriodo,
  textoPeriodo,
  ultimosMeses,
  type Periodo,
} from '../services/textos-checkout';
import { clasePildora } from './comunes';

interface FiltroPeriodoProps {
  periodo: Periodo;
  /** Hoy en Colombia (`hoyColombia()`), para calcular los botones rápidos. */
  hoy: string;
  enlace: (p: Periodo) => string;
  onAplicar: (p: Periodo) => void;
}

/** R18: hoy, ayer, últimos 7 días, este mes, mes anterior, un mes elegido o un rango de fechas. */
export function FiltroPeriodo({ periodo, hoy, enlace, onAplicar }: FiltroPeriodoProps) {
  const rapido = periodoRapidoDe(periodo, hoy);
  const sinPeriodo = periodo.desde === null && periodo.hasta === null;
  const mes = rapido === null ? mesDe(periodo) : null;
  const [desde, setDesde] = useState(periodo.desde ?? '');
  const [hasta, setHasta] = useState(periodo.hasta ?? '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDesde(periodo.desde ?? '');
    setHasta(periodo.hasta ?? '');
    setError(null);
  }, [periodo.desde, periodo.hasta]);

  const aplicarRango = (e: FormEvent) => {
    e.preventDefault();
    if (desde !== '' && hasta !== '' && desde > hasta) {
      setError('La fecha inicial no puede ser posterior a la final.');
      return;
    }
    setError(null);
    onAplicar({ desde: desde === '' ? null : desde, hasta: hasta === '' ? null : hasta });
  };

  return (
    <section aria-labelledby="titulo-periodo" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="titulo-periodo" className="flex items-center gap-2 font-title text-sm font-semibold text-neutral-black">
          <CalendarDays aria-hidden className="h-4 w-4 text-action" />
          Periodo
        </h2>
        <p className="text-xs text-neutral-medium" aria-live="polite">
          Mostrando: <span className="font-semibold text-neutral-dark">{textoPeriodo(periodo)}</span>
        </p>
      </div>

      <nav aria-label="Periodo rápido" className="flex flex-wrap gap-2">
        <Link href={enlace(SIN_PERIODO)} aria-current={sinPeriodo ? 'page' : undefined} className={clasePildora(sinPeriodo)}>
          Todas las fechas
        </Link>
        {PERIODOS_RAPIDOS.map((r) => (
          <Link
            key={r.valor}
            href={enlace(rangoDePeriodo(r.valor, hoy))}
            aria-current={rapido === r.valor ? 'page' : undefined}
            className={clasePildora(rapido === r.valor)}
          >
            {r.etiqueta}
          </Link>
        ))}
      </nav>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
        <Select
          id="periodo-mes"
          label="Elegir mes"
          options={[{ value: '', label: 'Selecciona un mes' }, ...ultimosMeses(hoy)]}
          value={mes ?? ''}
          onChange={(e) => {
            if (e.target.value !== '') onAplicar(mesCompleto(e.target.value));
          }}
        />
        <form onSubmit={aplicarRango} aria-label="Rango de fechas" className="flex flex-wrap items-end gap-3">
          <div className="min-w-[10rem] flex-1">
            <Input id="periodo-desde" label="Desde" type="date" value={desde} max={hasta || undefined} onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div className="min-w-[10rem] flex-1">
            <Input
              id="periodo-hasta"
              label="Hasta"
              type="date"
              value={hasta}
              min={desde || undefined}
              onChange={(e) => setHasta(e.target.value)}
            />
          </div>
          <Button type="submit" variant="outline">
            Aplicar
          </Button>
        </form>
      </div>
      {error !== null && (
        <p role="alert" className="text-sm text-danger-hover">
          {error}
        </p>
      )}
    </section>
  );
}
