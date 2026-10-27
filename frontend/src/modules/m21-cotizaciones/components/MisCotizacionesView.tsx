'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { FileText } from 'lucide-react';
import { Alert, ButtonLink, Container, Skeleton } from '@/core/components';
import { formatCOP } from '@/core/utils/moneda';
import type { EstadoCotizacion } from '../dtos/m21-cotizaciones.dto';
import { cotizacionesApi, mensajeDeError, requiereSesion, type PaginaCotizaciones } from '../services/cotizaciones-api';
import { estadoDeUrl, fechaCorta, paginaDeUrl } from '../services/textos-cotizaciones';
import { EstadoCotizacionBadge, FiltrosEstado, Paginacion } from './comunes';

/** /cotizaciones: las cotizaciones del cliente, con filtro por estado en la URL (R1). */
export function MisCotizacionesView() {
  const router = useRouter();
  const ruta = usePathname();
  const params = useSearchParams();
  const estado = estadoDeUrl(params.get('estado'));
  const pagina = paginaDeUrl(params.get('pagina'));
  const [datos, setDatos] = useState<PaginaCotizaciones | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sinSesion, setSinSesion] = useState(false);

  useEffect(() => {
    let vigente = true;
    setDatos(null);
    setError(null);
    cotizacionesApi
      .misCotizaciones({ estado, pagina })
      .then((d) => vigente && setDatos(d))
      .catch((err: unknown) => {
        if (!vigente) return;
        if (requiereSesion(err)) setSinSesion(true);
        else setError(mensajeDeError(err, 'No fue posible cargar tus cotizaciones.'));
      });
    return () => {
      vigente = false;
    };
  }, [estado, pagina]);

  const enlace = (e: EstadoCotizacion | null, p = 1): string => {
    const q = new URLSearchParams();
    if (e !== null) q.set('estado', e);
    if (p > 1) q.set('pagina', String(p));
    const s = q.toString();
    return s === '' ? ruta : `${ruta}?${s}`;
  };

  return (
    <Container className="min-h-[60vh] py-8">
      <h1 className="font-title text-2xl font-bold text-corporate sm:text-3xl">Mis cotizaciones</h1>
      <p className="mt-1 text-sm text-neutral-medium">Precios especiales que pediste desde tu carrito y su respuesta.</p>

      {sinSesion ? (
        <div className="mt-8 space-y-4 text-center">
          <p className="text-neutral-dark">Inicia sesión para ver tus cotizaciones.</p>
          <ButtonLink href={`/login?destino=${encodeURIComponent('/cotizaciones')}`}>Iniciar sesión</ButtonLink>
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          <FiltrosEstado actual={estado} enlace={(e) => enlace(e)} />
          {error !== null && <Alert variant="error">{error}</Alert>}
          {datos === null && error === null ? (
            <div className="space-y-3">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          ) : datos !== null && datos.items.length === 0 ? (
            <div className="mx-auto flex max-w-xl flex-col items-center gap-3 rounded-card border border-neutral-light bg-neutral-white px-6 py-10 text-center">
              <FileText aria-hidden className="h-10 w-10 text-action" />
              <p className="font-title text-lg font-bold text-neutral-black">
                {estado === null ? 'Aún no has pedido cotizaciones' : 'No hay cotizaciones con este estado'}
              </p>
              <p className="text-sm text-neutral-dark">Arma tu carrito y pulsa «Solicitar cotización» para pedir un precio especial.</p>
              <ButtonLink href="/carrito">Ir al carrito</ButtonLink>
            </div>
          ) : (
            datos !== null && (
              <>
                <ul className="space-y-3">
                  {datos.items.map((c) => (
                    <li key={c.idCotizacion}>
                      <Link
                        href={`/cotizaciones/${c.idCotizacion}`}
                        className="flex flex-col gap-2 rounded-card border border-neutral-light bg-neutral-white p-4 shadow-card transition-shadow hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="space-y-1">
                          <p className="flex items-center gap-2">
                            <span className="font-title font-bold text-neutral-black">{c.codigo}</span>
                            <EstadoCotizacionBadge estado={c.estado} />
                          </p>
                          <p className="text-sm text-neutral-medium">
                            Pedida el {fechaCorta(c.fechaCreacion)} · {c.cantidadLineas}{' '}
                            {c.cantidadLineas === 1 ? 'producto' : 'productos'}
                            {c.estado === 'enviada' && c.fechaVencimiento !== null && ` · Vence el ${fechaCorta(c.fechaVencimiento)}`}
                          </p>
                        </div>
                        <p className="font-title text-lg font-bold text-neutral-black sm:text-right">
                          {formatCOP(c.totalAcordado ?? c.totalReferencia)}
                          <span className="block text-xs font-normal text-neutral-medium">
                            {c.totalAcordado === null ? 'Total con precios del carrito' : 'Total acordado'}
                          </span>
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Paginacion pagina={datos.pagina} totalPaginas={datos.totalPaginas} onCambiar={(p) => router.push(enlace(estado, p))} />
              </>
            )
          )}
        </div>
      )}
    </Container>
  );
}
