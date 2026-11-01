'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CircleCheck, Receipt, Search, UserRound, Wallet, X } from 'lucide-react';
import { AdminPageHeader, AdminStatCard, Alert, Button, ButtonLink, Input, Skeleton } from '@/core/components';
import { formatCOP } from '@/core/utils/moneda';
import type { EstadoSolicitud } from '../dtos/m07-checkout.dto';
import { checkoutApi, mensajeDeError, type PaginaSolicitudes } from '../services/checkout-api';
import {
  estadoDeUrl,
  fechaHora,
  hoyColombia,
  idDeUrl,
  paginaDeUrl,
  periodoDeUrl,
  textoPeriodo,
  type Periodo,
} from '../services/textos-checkout';
import { EstadoSolicitudBadge, FiltrosEstado, Paginacion } from './comunes';
import { FiltroPeriodo } from './FiltroPeriodo';

interface Filtros {
  estado: EstadoSolicitud | null;
  pagina: number;
  busqueda: string;
  periodo: Periodo;
  idCliente: number | null;
}

/**
 * /admin/pagos: compras pagadas o por pagar. Estado, búsqueda, periodo (R18) y cliente viajan en la URL; el permiso
 * lo decide el servidor (R16).
 */
export function PagosAdminView() {
  const router = useRouter();
  const ruta = usePathname();
  const params = useSearchParams();
  const estado = estadoDeUrl(params.get('estado'));
  const pagina = paginaDeUrl(params.get('pagina'));
  const busqueda = params.get('busqueda') ?? '';
  const { desde, hasta } = periodoDeUrl(params);
  const idCliente = idDeUrl(params.get('cliente'));
  const hoy = useMemo(() => hoyColombia(), []);
  const [texto, setTexto] = useState(busqueda);
  const [datos, setDatos] = useState<PaginaSolicitudes | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setTexto(busqueda), [busqueda]);

  useEffect(() => {
    let vigente = true;
    setDatos(null);
    setError(null);
    checkoutApi
      .listarAdmin({ estado, pagina, busqueda, desde, hasta, idCliente })
      .then((d) => vigente && setDatos(d))
      .catch((err: unknown) => vigente && setError(mensajeDeError(err, 'No fue posible cargar los pagos.')));
    return () => {
      vigente = false;
    };
  }, [estado, pagina, busqueda, desde, hasta, idCliente]);

  const actuales: Filtros = { estado, pagina: 1, busqueda, periodo: { desde, hasta }, idCliente };

  /** Cualquier cambio de filtro vuelve a la página 1, salvo que se pida otra. */
  const enlace = (cambios: Partial<Filtros>): string => {
    const f = { ...actuales, ...cambios };
    const q = new URLSearchParams();
    if (f.estado !== null) q.set('estado', f.estado);
    if (f.busqueda.trim() !== '') q.set('busqueda', f.busqueda.trim());
    if (f.periodo.desde !== null) q.set('desde', f.periodo.desde);
    if (f.periodo.hasta !== null) q.set('hasta', f.periodo.hasta);
    if (f.idCliente !== null) q.set('cliente', String(f.idCliente));
    if (f.pagina > 1) q.set('pagina', String(f.pagina));
    const s = q.toString();
    return s === '' ? ruta : `${ruta}?${s}`;
  };

  const nombreCliente = datos?.items[0]?.cliente.nombre ?? `cliente #${idCliente ?? ''}`;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Pagos"
        subtitle="Compras con Nequi por Wompi. Filtra por periodo, revisa las que quedaron en revisión o pagadas sin pedido y concílialas con Wompi."
      />

      {idCliente !== null && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-action/30 bg-subaction px-4 py-3">
          <p className="flex items-center gap-2 text-sm text-neutral-dark">
            <UserRound aria-hidden className="h-4 w-4 text-action" />
            Pagos de <span className="font-semibold text-neutral-black">{nombreCliente}</span>
          </p>
          <Link
            href={enlace({ idCliente: null })}
            className="inline-flex items-center gap-1 font-title text-xs font-semibold text-action hover:text-action-hover"
          >
            <X aria-hidden className="h-3.5 w-3.5" />
            Ver todos los clientes
          </Link>
        </div>
      )}

      <div className="space-y-5 rounded-card border border-neutral-light/70 bg-neutral-white p-5 shadow-card">
        <FiltroPeriodo
          periodo={{ desde, hasta }}
          hoy={hoy}
          enlace={(p) => enlace({ periodo: p })}
          onAplicar={(p) => router.push(enlace({ periodo: p }))}
        />
        <div className="flex flex-col gap-4 border-t border-neutral-light pt-5 lg:flex-row lg:items-center lg:justify-between">
          <FiltrosEstado actual={estado} enlace={(e) => enlace({ estado: e })} />
          <form
            role="search"
            className="flex w-full gap-2 lg:w-96"
            onSubmit={(e) => {
              e.preventDefault();
              router.push(enlace({ busqueda: texto }));
            }}
          >
            <Input
              id="buscar-pago"
              aria-label="Buscar por código o cliente"
              placeholder="SOL-…, PC-… o cliente"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              leftIcon={<Search aria-hidden className="h-4 w-4" />}
            />
            <Button type="submit" variant="outline">
              Buscar
            </Button>
          </form>
        </div>
      </div>

      {error !== null && <Alert variant="error">{error}</Alert>}

      {datos === null && error === null ? (
        <Skeleton className="h-64" />
      ) : (
        datos !== null && (
          <>
            <section aria-label="Resumen del periodo" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <AdminStatCard
                label="Compras"
                value={datos.resumen.cantidad}
                trendText={textoPeriodo({ desde, hasta })}
                trendType="neutral"
                icon={<Receipt className="h-5 w-5" />}
              />
              <AdminStatCard
                label="Con pago aprobado"
                value={datos.resumen.pagadas}
                trendText="Aprobadas por Wompi"
                trendType="positive"
                icon={<CircleCheck className="h-5 w-5" />}
              />
              <AdminStatCard
                label="Dinero recibido"
                value={formatCOP(datos.resumen.totalPagado)}
                trendText="Total cobrado, con IVA y envío"
                trendType="positive"
                icon={<Wallet className="h-5 w-5" />}
              />
            </section>

            {datos.items.length === 0 ? (
              <p className="rounded-card border border-neutral-light/70 bg-neutral-white p-8 text-center text-sm text-neutral-medium">
                No hay compras con estos filtros.
              </p>
            ) : (
              <>
                <div className="overflow-x-auto rounded-card border border-neutral-light/70 bg-neutral-white shadow-card">
                  <table className="w-full min-w-[920px] text-sm">
                    <caption className="sr-only">Pagos ({datos.total})</caption>
                    <thead className="bg-neutral-lightest text-left text-xs uppercase tracking-wide text-neutral-medium">
                      <tr>
                        <th scope="col" className="px-4 py-3 font-semibold">Compra</th>
                        <th scope="col" className="px-4 py-3 font-semibold">Cliente</th>
                        <th scope="col" className="px-4 py-3 font-semibold">Fecha</th>
                        <th scope="col" className="px-4 py-3 font-semibold">Estado</th>
                        <th scope="col" className="px-4 py-3 font-semibold">Pedido</th>
                        <th scope="col" className="px-4 py-3 text-right font-semibold">Total</th>
                        <th scope="col" className="px-4 py-3 text-right font-semibold">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-light">
                      {datos.items.map((s) => (
                        <tr key={s.codigo} className="hover:bg-neutral-lightest">
                          <td className="px-4 py-3">
                            <Link href={`/admin/pagos/${s.codigo}`} className="font-title font-bold text-action hover:text-action-hover">
                              {s.codigo}
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-neutral-black">{s.cliente.nombre}</p>
                            <p className="text-xs text-neutral-medium">{s.cliente.correo}</p>
                          </td>
                          <td className="px-4 py-3 text-neutral-dark">{fechaHora(s.creadaEn)}</td>
                          <td className="px-4 py-3">
                            <EstadoSolicitudBadge estado={s.estado} />
                          </td>
                          <td className="px-4 py-3 text-neutral-dark">{s.codigoOrden ?? '—'}</td>
                          <td className="px-4 py-3 text-right font-title font-semibold text-neutral-black">{formatCOP(s.totalACobrar)}</td>
                          <td className="px-4 py-3 text-right">
                            <ButtonLink href={`/admin/pagos/${s.codigo}`} variant="outline" size="sm">
                              Ver detalle
                            </ButtonLink>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Paginacion
                  pagina={datos.pagina}
                  totalPaginas={datos.totalPaginas}
                  onCambiar={(p) => router.push(enlace({ pagina: p }))}
                />
              </>
            )}
          </>
        )
      )}
    </div>
  );
}
