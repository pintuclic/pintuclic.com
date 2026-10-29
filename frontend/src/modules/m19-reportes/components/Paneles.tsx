'use client';

import React, { useState } from 'react';
import { Alert, Select, SegmentedTabs, Skeleton } from '@/core/components';
import { DIMENSIONES_VENTA, type Agrupacion, type DimensionVenta } from '../dtos/m19-reportes.dto';
import { agrupacionesPosibles, diasDelRango } from '../services/periodos';
import { reportesApi, type RangoConsulta } from '../services/reportes-api';
import { ETIQUETA_AGRUPACION, ETIQUETA_ESTADO, decimal, entero, etiquetaIntervalo, fechaCorta, pesos } from '../services/formato-reportes';
import { BotonDescargarCsv } from './BotonDescargarCsv';
import { GraficoBarras, GraficoRanking } from './Graficos';
import { Indicador } from './Indicador';
import { useReporte, type EstadoReporte } from './useReporte';

const clave = (r: RangoConsulta, ...extra: Array<string | number>): string => [r.desde, r.hasta, ...extra].join('|');

function Cargando<T>({ e, children }: { e: EstadoReporte<T>; children: (d: T) => React.ReactNode }) {
  if (e.error !== null) return <Alert variant="warning">{e.error}</Alert>;
  if (e.datos === null) return <Skeleton className="h-72 w-full" />;
  return <div aria-busy={e.cargando} className={e.cargando ? 'opacity-60 transition-opacity' : ''}>{children(e.datos)}</div>;
}

const Tabla: React.FC<{ titulo: string; encabezados: ReadonlyArray<string>; filas: ReadonlyArray<ReadonlyArray<React.ReactNode>>; vacio?: string }> = ({ titulo, encabezados, filas, vacio = 'No hay datos en este periodo.' }) => (
  <div className="overflow-x-auto rounded-card border border-neutral-light bg-neutral-white">
    <table className="w-full min-w-[480px] text-left font-sans text-sm">
      <caption className="sr-only">{titulo}</caption>
      <thead className="bg-neutral-lightest text-xs uppercase tracking-wide text-neutral-medium">
        <tr>
          {encabezados.map((h, i) => (
            <th key={h} scope="col" className={`px-4 py-3 ${i === 0 ? '' : 'text-right'}`}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-neutral-light">
        {filas.length === 0 && (
          <tr><td colSpan={encabezados.length} className="px-4 py-6 text-center text-neutral-medium">{vacio}</td></tr>
        )}
        {filas.map((f, i) => (
          <tr key={i}>
            {f.map((c, j) => (
              <td key={j} className={`px-4 py-2.5 ${j === 0 ? 'text-neutral-black' : 'text-right text-neutral-dark'}`}>{c}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const Seccion: React.FC<{ titulo: string; acciones?: React.ReactNode; children: React.ReactNode }> = ({ titulo, acciones, children }) => (
  <section aria-label={titulo} className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="font-title text-lg font-semibold text-corporate">{titulo}</h2>
      {acciones}
    </div>
    {children}
  </section>
);

/* ── Resumen ─────────────────────────────────────────────────────────────── */
export const PanelResumen: React.FC<{ rango: RangoConsulta }> = ({ rango }) => {
  const resumen = useReporte(clave(rango, 'resumen'), () => reportesApi.resumen(rango));
  const compradores = useReporte(clave(rango, 'compradores'), () => reportesApi.compradores(rango));
  return (
    <div className="space-y-8">
      <Seccion titulo="Cómo van las ventas" acciones={<BotonDescargarCsv ruta="/resumen" params={{ desde: rango.desde, hasta: rango.hasta }} />}>
        <Cargando e={resumen}>
          {(r) => (
            <div className="space-y-6">
              <p className="font-sans text-sm text-neutral-medium">
                Del {fechaCorta(r.periodo.desde)} al {fechaCorta(r.periodo.hasta)} ({r.periodo.dias} {r.periodo.dias === 1 ? 'día' : 'días'}), comparado con el {fechaCorta(r.periodoAnterior.desde)} al {fechaCorta(r.periodoAnterior.hasta)}. Una venta es una orden que no está cancelada ni devuelta.
              </p>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Indicador titulo="Total cobrado" valor={pesos(r.actual.totalCobrado)} variacion={r.variacion.totalCobrado} nota="IVA y envío incluidos" />
                <Indicador titulo="Órdenes" valor={entero(r.actual.ordenes)} variacion={r.variacion.ordenes} />
                <Indicador titulo="Ticket promedio" valor={r.actual.ticketPromedio === null ? '—' : pesos(r.actual.ticketPromedio)} variacion={r.variacion.ticketPromedio} nota="Total cobrado por orden" />
                <Indicador titulo="Unidades vendidas" valor={entero(r.actual.unidades)} variacion={r.variacion.unidades} />
              </div>
              <Tabla
                titulo="Detalle de las cifras"
                encabezados={['Concepto', 'Este periodo', 'Periodo anterior']}
                filas={[
                  ['Ventas brutas (antes de descuentos)', pesos(r.actual.ventasBrutas), pesos(r.anterior.ventasBrutas)],
                  ['Descuentos', pesos(r.actual.descuentos), pesos(r.anterior.descuentos)],
                  ['Envío', pesos(r.actual.envio), pesos(r.anterior.envio)],
                  ['Base sin IVA', pesos(r.actual.baseSinIva), pesos(r.anterior.baseSinIva)],
                  ['IVA', pesos(r.actual.iva), pesos(r.anterior.iva)],
                  ['Total cobrado', pesos(r.actual.totalCobrado), pesos(r.anterior.totalCobrado)],
                ]}
              />
              <Seccion titulo="Órdenes por estado">
                <Tabla titulo="Órdenes por estado" encabezados={['Estado', 'Órdenes', 'Total']} filas={r.porEstado.map((e) => [ETIQUETA_ESTADO[e.estado] ?? e.estado, entero(e.ordenes), pesos(e.total)])} />
                <p className="font-sans text-xs text-neutral-medium">Las canceladas y devueltas se muestran aquí para ver cuánto se pierde, pero no suman a las ventas de arriba.</p>
              </Seccion>
            </div>
          )}
        </Cargando>
      </Seccion>
      <Seccion titulo="Quiénes compran" acciones={<BotonDescargarCsv ruta="/compradores" params={{ desde: rango.desde, hasta: rango.hasta }} />}>
        <Cargando e={compradores}>
          {(c) => (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Indicador titulo="Clientes que compraron" valor={entero(c.compradores)} />
              <Indicador titulo="Clientes nuevos" valor={entero(c.nuevos)} nota="Su primera compra fue en este periodo" />
              <Indicador titulo="Clientes que vuelven" valor={entero(c.recurrentes)} nota="Ya habían comprado antes" />
              <Indicador titulo="Órdenes por cliente" valor={c.ordenesPorComprador === null ? '—' : decimal(c.ordenesPorComprador)} nota={`${entero(c.compraronMasDeUnaVez)} compraron más de una vez`} />
            </div>
          )}
        </Cargando>
      </Seccion>
    </div>
  );
};

/* ── Tendencia ───────────────────────────────────────────────────────────── */
export const PanelTendencia: React.FC<{ rango: RangoConsulta; agrupar: Agrupacion; onAgrupar: (a: Agrupacion) => void }> = ({ rango, agrupar, onAgrupar }) => {
  const dias = diasDelRango(rango.desde, rango.hasta);
  const posibles = agrupacionesPosibles(dias);
  const agrupacion = posibles.includes(agrupar) ? agrupar : (posibles[0] ?? 'dia');
  const serie = useReporte(clave(rango, 'serie', agrupacion), () => reportesApi.serie(rango, agrupacion));
  return (
    <Seccion titulo="Ventas en el tiempo" acciones={<BotonDescargarCsv ruta="/serie" params={{ desde: rango.desde, hasta: rango.hasta, agrupar: agrupacion }} />}>
      <div className="sm:w-56">
        <Select id="agrupar-serie" label="Agrupar" value={agrupacion} onChange={(e) => onAgrupar(e.target.value as Agrupacion)} options={posibles.map((a) => ({ value: a, label: ETIQUETA_AGRUPACION[a] }))} />
      </div>
      <Cargando e={serie}>
        {(s) => {
          const total = s.puntos.reduce((t, p) => t + p.totalCobrado, 0);
          const mejor = s.puntos.reduce((m, p) => (p.totalCobrado > m.totalCobrado ? p : m), s.puntos[0] ?? { periodo: '', ordenes: 0, unidades: 0, totalCobrado: 0 });
          return (
            <div className="space-y-4">
              <GraficoBarras
                datos={s.puntos.map((p) => ({ etiqueta: etiquetaIntervalo(p.periodo, s.agrupar), valor: p.totalCobrado, detalle: `${pesos(p.totalCobrado)} · ${entero(p.ordenes)} órdenes` }))}
                resumen={`Total cobrado ${ETIQUETA_AGRUPACION[s.agrupar].toLowerCase()}: ${pesos(total)} en ${s.puntos.length} periodos${total > 0 ? `; el mejor fue ${etiquetaIntervalo(mejor.periodo, s.agrupar)} con ${pesos(mejor.totalCobrado)}` : ''}.`}
                formatoMaximo={pesos}
              />
              <Tabla
                titulo="Ventas por periodo"
                encabezados={['Periodo', 'Órdenes', 'Unidades', 'Total cobrado']}
                filas={[...s.puntos].reverse().map((p) => [etiquetaIntervalo(p.periodo, s.agrupar), entero(p.ordenes), entero(p.unidades), pesos(p.totalCobrado)])}
              />
            </div>
          );
        }}
      </Cargando>
    </Seccion>
  );
};

/* ── Ventas por… ─────────────────────────────────────────────────────────── */
const ETIQUETA_DIMENSION: Record<DimensionVenta, string> = { producto: 'Producto', categoria: 'Categoría', marca: 'Marca', tipo_cliente: 'Tipo de cliente', modo_entrega: 'Entrega' };

export const PanelVentasPor: React.FC<{ rango: RangoConsulta }> = ({ rango }) => {
  const [dimension, setDimension] = useState<DimensionVenta>('producto');
  const [orden, setOrden] = useState<'importe' | 'unidades'>('importe');
  const reporte = useReporte(clave(rango, 'por', dimension, orden), () => reportesApi.ventasPor(dimension, rango, orden, 20));
  return (
    <Seccion titulo="Qué se vende más" acciones={<BotonDescargarCsv ruta={`/ventas-por/${dimension}`} params={{ desde: rango.desde, hasta: rango.hasta, orden }} />}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="sm:w-[560px]">
          <SegmentedTabs options={DIMENSIONES_VENTA.map((d) => ({ value: d, label: ETIQUETA_DIMENSION[d] }))} value={dimension} onChange={setDimension} ariaLabel="Agrupar las ventas por" idPrefix="ventas-por" panelId="ventas-por-panel" />
        </div>
        <div className="sm:w-48">
          <Select id="orden-ventas-por" label="Ordenar por" value={orden} onChange={(e) => setOrden(e.target.value === 'unidades' ? 'unidades' : 'importe')} options={[{ value: 'importe', label: 'Importe vendido' }, { value: 'unidades', label: 'Unidades' }]} />
        </div>
      </div>
      <div id="ventas-por-panel" role="tabpanel" aria-labelledby={`ventas-por-tab-${dimension}`} className="space-y-4">
        <Cargando e={reporte}>
          {(v) => (
            <>
              <GraficoRanking
                ariaLabel={`Ventas por ${ETIQUETA_DIMENSION[dimension].toLowerCase()}`}
                filas={v.filas.map((f) => ({ etiqueta: f.etiqueta, valor: orden === 'unidades' ? f.unidades : f.importe, texto: orden === 'unidades' ? `${entero(f.unidades)} und.` : pesos(f.importe), participacion: f.participacion }))}
              />
              <Tabla
                titulo={`Ventas por ${ETIQUETA_DIMENSION[dimension].toLowerCase()}`}
                encabezados={[ETIQUETA_DIMENSION[dimension], 'Órdenes', 'Unidades', 'Importe', '% del total']}
                filas={v.filas.map((f) => [f.etiqueta, entero(f.ordenes), entero(f.unidades), pesos(f.importe), `${decimal(f.participacion)} %`])}
              />
              <p className="font-sans text-xs text-neutral-medium">
                Total del periodo: {pesos(v.total.importe)} en {entero(v.total.unidades)} unidades. El importe suma el precio de cada línea ya con sus descuentos, sin envío.
                {v.dimension === 'categoria' || v.dimension === 'marca' ? ' Un producto retirado del catálogo aparece como «Sin clasificar».' : ''}
              </p>
            </>
          )}
        </Cargando>
      </div>
    </Seccion>
  );
};

/* ── Descuentos ──────────────────────────────────────────────────────────── */
export const PanelDescuentos: React.FC<{ rango: RangoConsulta }> = ({ rango }) => {
  const reporte = useReporte(clave(rango, 'descuentos'), () => reportesApi.descuentos(rango));
  return (
    <Seccion titulo="Descuentos otorgados" acciones={<BotonDescargarCsv ruta="/descuentos" params={{ desde: rango.desde, hasta: rango.hasta }} />}>
      <Cargando e={reporte}>
        {(d) => (
          <div className="space-y-4">
            <Indicador titulo="Total en descuentos de línea" valor={pesos(d.totalDescuentos)} nota="Eventos, cupones y descuento por tipo de cliente" />
            <GraficoRanking ariaLabel="Descuentos por origen" filas={d.filas.map((f) => ({ etiqueta: f.origen, valor: f.importe, texto: pesos(f.importe) }))} />
            <Tabla titulo="Descuentos por origen" encabezados={['Origen', 'Líneas', 'Órdenes', 'Importe']} filas={d.filas.map((f) => [f.origen, entero(f.lineasAfectadas), entero(f.ordenes), pesos(f.importe)])} vacio="No se dieron descuentos en este periodo." />
          </div>
        )}
      </Cargando>
    </Seccion>
  );
};

/* ── Clientes ────────────────────────────────────────────────────────────── */
export const PanelClientes: React.FC<{ rango: RangoConsulta }> = ({ rango }) => {
  const reporte = useReporte(clave(rango, 'clientes'), () => reportesApi.clientes(rango, 20));
  return (
    <Seccion titulo="Quiénes compran más" acciones={<BotonDescargarCsv ruta="/clientes" params={{ desde: rango.desde, hasta: rango.hasta }} />}>
      <Cargando e={reporte}>
        {(t) => (
          <div className="space-y-4">
            <GraficoRanking ariaLabel="Clientes por total cobrado" filas={t.filas.map((f) => ({ etiqueta: f.nombre, valor: f.totalCobrado, texto: pesos(f.totalCobrado) }))} />
            <Tabla
              titulo="Clientes con más compras"
              encabezados={['Cliente', 'Tipo', 'Órdenes', 'Unidades', 'Total cobrado']}
              filas={t.filas.map((f) => [`${String(f.posicion)}. ${f.nombre}`, f.tipo === 'empresa' ? 'Empresa' : 'Persona', entero(f.ordenes), entero(f.unidades), pesos(f.totalCobrado)])}
            />
            <p className="font-sans text-xs text-neutral-medium">Solo se muestra el nombre del cliente o su razón social: nunca su correo, teléfono ni dirección.</p>
          </div>
        )}
      </Cargando>
    </Seccion>
  );
};

/* ── Postventa y facturación ─────────────────────────────────────────────── */
export const PanelOperacion: React.FC<{ rango: RangoConsulta }> = ({ rango }) => {
  const postventa = useReporte(clave(rango, 'postventa'), () => reportesApi.postventa(rango));
  const facturacion = useReporte(clave(rango, 'facturacion'), () => reportesApi.facturacion(rango));
  return (
    <div className="space-y-8">
      <Seccion titulo="Comprobantes de venta" acciones={<BotonDescargarCsv ruta="/facturacion" params={{ desde: rango.desde, hasta: rango.hasta }} />}>
        <Cargando e={facturacion}>
          {(f) => (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Indicador titulo="Ventas del periodo" valor={entero(f.ventas)} />
              <Indicador titulo="Con comprobante" valor={entero(f.conComprobante)} />
              <Indicador titulo="Sin comprobante" valor={entero(f.sinComprobante)} nota={f.sinComprobante > 0 ? 'Se emiten al completar los datos de facturación' : undefined} />
              <Indicador titulo="Último número emitido" valor={f.ultimoNumero ?? '—'} />
            </div>
          )}
        </Cargando>
      </Seccion>
      <Seccion titulo="Devoluciones y reembolsos" acciones={<BotonDescargarCsv ruta="/postventa" params={{ desde: rango.desde, hasta: rango.hasta }} />}>
        <Cargando e={postventa}>
          {(p) => (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <Indicador titulo="Solicitudes" valor={entero(p.solicitudes)} />
                <Indicador titulo="Reembolsos hechos" valor={entero(p.reembolsos.cantidad)} />
                <Indicador titulo="Total reembolsado" valor={pesos(p.reembolsos.totalReembolsado)} />
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <Tabla titulo="Solicitudes por tipo" encabezados={['Tipo', 'Solicitudes']} filas={p.porTipo.map((t) => [t.tipo.replaceAll('_', ' '), entero(t.solicitudes)])} vacio="No hubo solicitudes." />
                <Tabla titulo="Solicitudes por estado" encabezados={['Estado', 'Solicitudes']} filas={p.porEstado.map((e) => [e.estado.replaceAll('_', ' '), entero(e.solicitudes)])} vacio="No hubo solicitudes." />
              </div>
            </div>
          )}
        </Cargando>
      </Seccion>
    </div>
  );
};
