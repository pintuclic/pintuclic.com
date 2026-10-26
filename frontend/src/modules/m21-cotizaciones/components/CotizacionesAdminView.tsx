'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { AdminPageHeader, Alert, Button, Input, Skeleton } from '@/core/components';
import { formatCOP } from '@/core/utils/moneda';
import type { EstadoCotizacion } from '../dtos/m21-cotizaciones.dto';
import { cotizacionesApi, mensajeDeError, type PaginaCotizaciones } from '../services/cotizaciones-api';
import { estadoDeUrl, fechaCorta, paginaDeUrl } from '../services/textos-cotizaciones';
import { EstadoCotizacionBadge, FiltrosEstado, Paginacion } from './comunes';

/** /admin/cotizaciones: bandeja del equipo comercial. Filtros y búsqueda viajan en la URL; el permiso lo decide el servidor (R12). */
export function CotizacionesAdminView() {
  const router = useRouter();
  const ruta = usePathname();
  const params = useSearchParams();
  const estado = estadoDeUrl(params.get('estado'));
  const pagina = paginaDeUrl(params.get('pagina'));
  const busqueda = params.get('busqueda') ?? '';
  const [texto, setTexto] = useState(busqueda);
  const [datos, setDatos] = useState<PaginaCotizaciones | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setTexto(busqueda), [busqueda]);

  useEffect(() => {
    let vigente = true;
    setDatos(null);
    setError(null);
    cotizacionesApi
      .listarAdmin({ estado, pagina, busqueda })
      .then((d) => vigente && setDatos(d))
      .catch((err: unknown) => vigente && setError(mensajeDeError(err, 'No fue posible cargar las cotizaciones.')));
    return () => {
      vigente = false;
    };
  }, [estado, pagina, busqueda]);

  const enlace = (e: EstadoCotizacion | null, p = 1, b = busqueda): string => {
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
        title="Cotizaciones"
        subtitle="Solicitudes de precio especial que los clientes envían desde su carrito. Ajusta precios y cantidades y envía la respuesta."
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
            id="buscar-cotizacion"
            aria-label="Buscar por código o cliente"
            placeholder="Código (COT-000123) o cliente"
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
            No hay cotizaciones con estos filtros.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-card border border-neutral-light/70 bg-neutral-white shadow-card">
              <table className="w-full min-w-[760px] text-sm">
                <caption className="sr-only">Cotizaciones ({datos.total})</caption>
                <thead className="bg-neutral-lightest text-left text-xs uppercase tracking-wide text-neutral-medium">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">Código</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Cliente</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Pedida</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Estado</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Productos</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-light">
                  {datos.items.map((c) => (
                    <tr key={c.idCotizacion} className="hover:bg-neutral-lightest">
                      <td className="px-4 py-3">
                        <Link href={`/admin/cotizaciones/${c.idCotizacion}`} className="font-title font-bold text-action hover:text-action-hover">
                          {c.codigo}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-neutral-black">{c.cliente?.nombre ?? 'Cliente eliminado'}</p>
                        {c.cliente !== null && (
                          <p className="text-xs text-neutral-medium">
                            {c.cliente.correo}
                            {c.cliente.tipo === 'empresa' && ' · Empresa'}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-neutral-dark">{fechaCorta(c.fechaCreacion)}</td>
                      <td className="px-4 py-3">
                        <EstadoCotizacionBadge estado={c.estado} />
                      </td>
                      <td className="px-4 py-3 text-right text-neutral-dark">{c.cantidadLineas}</td>
                      <td className="px-4 py-3 text-right font-semibold text-neutral-black">
                        {formatCOP(c.totalAcordado ?? c.totalReferencia)}
                      </td>
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
