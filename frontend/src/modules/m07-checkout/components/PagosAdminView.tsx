'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { AdminPageHeader, Alert, Button, Input, Skeleton } from '@/core/components';
import { formatCOP } from '@/core/utils/moneda';
import type { EstadoSolicitud } from '../dtos/m07-checkout.dto';
import { checkoutApi, mensajeDeError, type PaginaSolicitudes } from '../services/checkout-api';
import { estadoDeUrl, fechaHora, paginaDeUrl } from '../services/textos-checkout';
import { EstadoSolicitudBadge, FiltrosEstado, Paginacion } from './comunes';

/** /admin/pagos: compras pagadas o por pagar. Filtros y búsqueda viajan en la URL; el permiso lo decide el servidor (R16). */
export function PagosAdminView() {
  const router = useRouter();
  const ruta = usePathname();
  const params = useSearchParams();
  const estado = estadoDeUrl(params.get('estado'));
  const pagina = paginaDeUrl(params.get('pagina'));
  const busqueda = params.get('busqueda') ?? '';
  const [texto, setTexto] = useState(busqueda);
  const [datos, setDatos] = useState<PaginaSolicitudes | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setTexto(busqueda), [busqueda]);

  useEffect(() => {
    let vigente = true;
    setDatos(null);
    setError(null);
    checkoutApi
      .listarAdmin({ estado, pagina, busqueda })
      .then((d) => vigente && setDatos(d))
      .catch((err: unknown) => vigente && setError(mensajeDeError(err, 'No fue posible cargar los pagos.')));
    return () => {
      vigente = false;
    };
  }, [estado, pagina, busqueda]);

  const enlace = (e: EstadoSolicitud | null, p = 1, b = busqueda): string => {
    const q = new URLSearchParams();
    if (e !== null) q.set('estado', e);
    if (b.trim() !== '') q.set('busqueda', b.trim());
    if (p > 1) q.set('pagina', String(p));
    const s = q.toString();
    return s === '' ? ruta : `${ruta}?${s}`;
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Pagos"
        subtitle="Compras con Nequi por Wompi. Revisa las que quedaron en revisión o pagadas sin pedido y concílialas con Wompi."
      />

      <div className="flex flex-col gap-4 rounded-card border border-neutral-light/70 bg-neutral-white p-5 shadow-card lg:flex-row lg:items-center lg:justify-between">
        <FiltrosEstado actual={estado} enlace={(e) => enlace(e)} />
        <form
          role="search"
          className="flex w-full gap-2 lg:w-96"
          onSubmit={(e) => {
            e.preventDefault();
            router.push(enlace(estado, 1, texto));
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

      {error !== null && <Alert variant="error">{error}</Alert>}

      {datos === null && error === null ? (
        <Skeleton className="h-64" />
      ) : (
        datos !== null &&
        (datos.items.length === 0 ? (
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Paginacion pagina={datos.pagina} totalPaginas={datos.totalPaginas} onCambiar={(p) => router.push(enlace(estado, p))} />
          </>
        ))
      )}
    </div>
  );
}
