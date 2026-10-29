'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AdminPageHeader, Input, SegmentedTabs, Select } from '@/core/components';
import { agrupacionSchema, type Agrupacion } from '../dtos/m19-reportes.dto';
import { ATAJOS, ETIQUETA_ATAJO, atajoDe, hoyColombia, rangoDeAtajo, type Atajo } from '../services/periodos';
import { PanelClientes, PanelDescuentos, PanelOperacion, PanelResumen, PanelTendencia, PanelVentasPor } from './Paneles';

const VISTAS = ['resumen', 'tendencia', 'ventas', 'descuentos', 'clientes', 'operacion'] as const;
type Vista = (typeof VISTAS)[number];
const ETIQUETA_VISTA: Record<Vista, string> = {
  resumen: 'Resumen',
  tendencia: 'En el tiempo',
  ventas: 'Qué se vende',
  descuentos: 'Descuentos',
  clientes: 'Clientes',
  operacion: 'Devoluciones y comprobantes',
};
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Reportes de ventas: resumen, tendencia semanal, mensual y anual, qué se vende, descuentos, clientes, devoluciones y
 * comprobantes. El rango, la vista y la agrupación viajan en la dirección de la página, así que se pueden compartir.
 */
export function ReportesView() {
  const router = useRouter();
  const ruta = usePathname();
  const params = useSearchParams();
  const hoy = useMemo(() => hoyColombia(), []);

  const porDefecto = rangoDeAtajo('30d', hoy);
  const desdeUrl = params.get('desde');
  const hastaUrl = params.get('hasta');
  const desde = desdeUrl !== null && FECHA.test(desdeUrl) ? desdeUrl : porDefecto.desde;
  const hasta = hastaUrl !== null && FECHA.test(hastaUrl) ? hastaUrl : porDefecto.hasta;
  const vistaUrl = VISTAS.find((v) => v === params.get('vista')) ?? 'resumen';
  const agruparUrl = agrupacionSchema.safeParse(params.get('agrupar'));
  const agrupar: Agrupacion = agruparUrl.success ? agruparUrl.data : porDefecto.agrupar;
  const atajo = atajoDe(desde, hasta, hoy);

  // Fechas a medias mientras se escriben: solo se aplican cuando son un rango válido.
  const [borrador, setBorrador] = useState({ desde, hasta });

  const ir = useCallback(
    (cambios: Record<string, string>) => {
      const q = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(cambios)) q.set(k, v);
      router.replace(`${ruta}?${q.toString()}`, { scroll: false });
    },
    [params, router, ruta],
  );

  const elegirAtajo = (a: Atajo): void => {
    if (a === 'libre') return;
    const r = rangoDeAtajo(a, hoy);
    setBorrador({ desde: r.desde, hasta: r.hasta });
    ir({ desde: r.desde, hasta: r.hasta, agrupar: r.agrupar });
  };

  const aplicarBorrador = (nuevo: { desde: string; hasta: string }): void => {
    setBorrador(nuevo);
    if (FECHA.test(nuevo.desde) && FECHA.test(nuevo.hasta) && nuevo.desde <= nuevo.hasta) ir({ desde: nuevo.desde, hasta: nuevo.hasta });
  };

  const rango = { desde, hasta };

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Reportes" subtitle="Ventas, clientes y descuentos de la tienda, por semana, mes o año. Todo sale de las órdenes reales." />

      <div className="grid gap-3 rounded-card border border-neutral-light bg-neutral-white p-4 shadow-card sm:grid-cols-2 lg:grid-cols-[16rem_1fr_1fr]">
        <Select id="atajo-periodo" label="Periodo" value={atajo} onChange={(e) => elegirAtajo(e.target.value as Atajo)} options={ATAJOS.map((a) => ({ value: a, label: ETIQUETA_ATAJO[a] }))} />
        <Input id="fecha-desde" label="Desde" type="date" value={borrador.desde} max={borrador.hasta} onChange={(e) => aplicarBorrador({ ...borrador, desde: e.target.value })} />
        <Input id="fecha-hasta" label="Hasta" type="date" value={borrador.hasta} min={borrador.desde} max={hoy} onChange={(e) => aplicarBorrador({ ...borrador, hasta: e.target.value })} />
      </div>

      <SegmentedTabs options={VISTAS.map((v) => ({ value: v, label: ETIQUETA_VISTA[v] }))} value={vistaUrl} onChange={(v) => ir({ vista: v })} ariaLabel="Reporte" idPrefix="reportes" panelId="reportes-panel" />

      <div id="reportes-panel" role="tabpanel" aria-labelledby={`reportes-tab-${vistaUrl}`}>
        {vistaUrl === 'resumen' && <PanelResumen rango={rango} />}
        {vistaUrl === 'tendencia' && <PanelTendencia rango={rango} agrupar={agrupar} onAgrupar={(a) => ir({ agrupar: a })} />}
        {vistaUrl === 'ventas' && <PanelVentasPor rango={rango} />}
        {vistaUrl === 'descuentos' && <PanelDescuentos rango={rango} />}
        {vistaUrl === 'clientes' && <PanelClientes rango={rango} />}
        {vistaUrl === 'operacion' && <PanelOperacion rango={rango} />}
      </div>
    </div>
  );
}
