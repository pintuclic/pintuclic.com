'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Wallet } from 'lucide-react';
import { Select, Skeleton } from '@/core/components';
import { formatCOP } from '@/core/utils/moneda';
import { checkoutApi, codigoDeError, mensajeDeError, type PaginaSolicitudes } from '../services/checkout-api';
import {
  SIN_PERIODO,
  fechaHora,
  hoyColombia,
  mesCompleto,
  mesDe,
  periodoRapidoDe,
  rangoDePeriodo,
  textoPeriodo,
  ultimosMeses,
  type Periodo,
  type PeriodoRapido,
} from '../services/textos-checkout';
import { EstadoSolicitudBadge, clasePildora } from './comunes';

const MAXIMO = 5;
const RAPIDOS: ReadonlyArray<{ valor: PeriodoRapido; etiqueta: string }> = [
  { valor: 'ultimos7', etiqueta: 'Últimos 7 días' },
  { valor: 'esteMes', etiqueta: 'Este mes' },
  { valor: 'mesAnterior', etiqueta: 'Mes anterior' },
];

/**
 * R18: los pagos de un cliente con filtro de periodo, para su ficha en el panel (M17). Muestra los más recientes y
 * enlaza a /admin/pagos filtrado por ese cliente y periodo. Sin `ventas.ver`, el servidor responde 404 y se avisa.
 */
export function PagosClienteResumen({ idCliente }: { idCliente: number }) {
  const hoy = useMemo(() => hoyColombia(), []);
  const [periodo, setPeriodo] = useState<Periodo>(SIN_PERIODO);
  const [datos, setDatos] = useState<PaginaSolicitudes | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    setDatos(null);
    setError(null);
    checkoutApi
      .listarAdmin({ estado: null, pagina: 1, busqueda: '', desde: periodo.desde, hasta: periodo.hasta, idCliente, limite: MAXIMO })
      .then((d) => vigente && setDatos(d))
      .catch(
        (err: unknown) =>
          vigente &&
          setError(
            codigoDeError(err) === 'RECURSO_NO_DISPONIBLE'
              ? 'No tienes permiso para ver los pagos.'
              : mensajeDeError(err, 'No fue posible cargar los pagos del cliente.'),
          ),
      );
    return () => {
      vigente = false;
    };
  }, [idCliente, periodo.desde, periodo.hasta]);

  const rapido = periodoRapidoDe(periodo, hoy);
  const sinPeriodo = periodo.desde === null && periodo.hasta === null;
  const q = new URLSearchParams({ cliente: String(idCliente) });
  if (periodo.desde !== null) q.set('desde', periodo.desde);
  if (periodo.hasta !== null) q.set('hasta', periodo.hasta);

  return (
    <section aria-labelledby={`pagos-cliente-${idCliente}`} className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={`pagos-cliente-${idCliente}`} className="flex items-center gap-2 font-title text-sm font-semibold text-corporate">
          <Wallet aria-hidden className="h-4 w-4 text-conversion" />
          Pagos
        </h3>
        <Link
          href={`/admin/pagos?${q.toString()}`}
          className="inline-flex items-center gap-1 font-title text-xs font-semibold text-action hover:text-action-hover"
        >
          Ver todos en Pagos
          <ArrowRight aria-hidden className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div role="group" aria-label="Periodo de los pagos" className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={sinPeriodo} className={clasePildora(sinPeriodo)} onClick={() => setPeriodo(SIN_PERIODO)}>
            Todas las fechas
          </button>
          {RAPIDOS.map((r) => (
            <button
              key={r.valor}
              type="button"
              aria-pressed={rapido === r.valor}
              className={clasePildora(rapido === r.valor)}
              onClick={() => setPeriodo(rangoDePeriodo(r.valor, hoy))}
            >
              {r.etiqueta}
            </button>
          ))}
        </div>
        <div className="w-48">
          <Select
            id={`pagos-cliente-mes-${idCliente}`}
            aria-label="Elegir mes"
            options={[{ value: '', label: 'Elegir mes' }, ...ultimosMeses(hoy)]}
            value={rapido === null ? (mesDe(periodo) ?? '') : ''}
            onChange={(e) => {
              if (e.target.value !== '') setPeriodo(mesCompleto(e.target.value));
            }}
          />
        </div>
      </div>

      {error !== null ? (
        <p role="alert" className="rounded-btn border border-neutral-light/50 bg-neutral-lightest p-4 text-center text-xs text-neutral-medium">
          {error}
        </p>
      ) : datos === null ? (
        <Skeleton className="h-24" />
      ) : (
        <>
          <p className="text-xs text-neutral-medium" aria-live="polite">
            {textoPeriodo(periodo)}:{' '}
            <span className="font-semibold text-neutral-dark">
              {datos.resumen.cantidad} {datos.resumen.cantidad === 1 ? 'compra' : 'compras'}
            </span>
            , {datos.resumen.pagadas} {datos.resumen.pagadas === 1 ? 'pagada' : 'pagadas'} ·{' '}
            <span className="font-semibold text-neutral-dark">{formatCOP(datos.resumen.totalPagado)} recibido</span>
          </p>
          {datos.items.length === 0 ? (
            <p className="rounded-btn border border-neutral-light/50 bg-neutral-lightest p-4 text-center text-xs text-neutral-medium">
              Sin pagos en este periodo.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-btn border border-neutral-light">
              <table className="w-full min-w-[480px] text-left text-xs">
                <caption className="sr-only">Pagos del cliente</caption>
                <thead className="border-b border-neutral-light bg-neutral-lightest font-title text-[10px] font-semibold uppercase text-neutral-medium">
                  <tr>
                    <th scope="col" className="px-4 py-2.5">Compra</th>
                    <th scope="col" className="px-4 py-2.5">Fecha</th>
                    <th scope="col" className="px-4 py-2.5">Estado</th>
                    <th scope="col" className="px-4 py-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-light/50 text-neutral-dark">
                  {datos.items.map((s) => (
                    <tr key={s.codigo} className="hover:bg-neutral-lightest/40">
                      <td className="px-4 py-2.5">
                        <Link href={`/admin/pagos/${s.codigo}`} className="font-mono font-semibold text-action hover:underline">
                          {s.codigo}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-neutral-medium">{fechaHora(s.creadaEn)}</td>
                      <td className="px-4 py-2.5">
                        <EstadoSolicitudBadge estado={s.estado} />
                      </td>
                      <td className="px-4 py-2.5 text-right font-title font-bold text-neutral-black">{formatCOP(s.totalACobrar)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {datos.total > datos.items.length && (
            <p className="text-xs text-neutral-medium">
              Se muestran los {datos.items.length} más recientes de {datos.total}.
            </p>
          )}
        </>
      )}
    </section>
  );
}
