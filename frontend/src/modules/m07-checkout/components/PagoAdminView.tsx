'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, RotateCcw } from 'lucide-react';
import { AdminPageHeader, Alert, Button, Skeleton } from '@/core/components';
import { formatCOP } from '@/core/utils/moneda';
import type { SolicitudAdmin } from '../dtos/m07-checkout.dto';
import { checkoutApi, mensajeDeError } from '../services/checkout-api';
import { fechaHora } from '../services/textos-checkout';
import { EstadoSolicitudBadge } from './comunes';

const ETIQUETA_WOMPI = {
  PENDING: 'Pendiente',
  APPROVED: 'Aprobado',
  DECLINED: 'Rechazado',
  ERROR: 'Error',
  VOIDED: 'Anulado',
} as const;

/** /admin/pagos/:codigo: la compra, sus intentos en Wompi y las dos acciones de conciliación (R16). */
export function PagoAdminView({ codigo }: { codigo: string }) {
  const [s, setS] = useState<SolicitudAdmin | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<'wompi' | 'orden' | null>(null);

  useEffect(() => {
    let vigente = true;
    checkoutApi
      .obtenerAdmin(codigo)
      .then((d) => vigente && setS(d))
      .catch((err: unknown) => vigente && setError(mensajeDeError(err, 'Esta compra no está disponible.')));
    return () => {
      vigente = false;
    };
  }, [codigo]);

  const accion = async (tipo: 'wompi' | 'orden'): Promise<void> => {
    setOcupado(tipo);
    setError(null);
    setAviso(null);
    try {
      const nueva = tipo === 'wompi' ? await checkoutApi.consultarWompi(codigo) : await checkoutApi.reintentarOrden(codigo);
      setS(nueva);
      setAviso(nueva.codigoOrden !== null ? `La compra tiene el pedido ${nueva.codigoOrden}.` : 'Listo. Revisa el estado de la compra.');
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'No fue posible completar la acción.'));
    } finally {
      setOcupado(null);
    }
  };

  return (
    <div className="space-y-6">
      <Link href="/admin/pagos" className="inline-flex items-center gap-1 font-title text-sm font-medium text-action hover:text-action-hover">
        <ArrowLeft aria-hidden className="h-4 w-4" />
        Volver a pagos
      </Link>
      {s === null ? (
        error !== null ? <Alert variant="error">{error}</Alert> : <Skeleton className="h-96" />
      ) : (
        <>
          <AdminPageHeader
            title={`Compra ${s.codigo}`}
            subtitle={`${s.cliente.nombre} · ${s.cliente.correo}`}
            metaPrimary={<EstadoSolicitudBadge estado={s.estado} />}
            metaSecondary={fechaHora(s.creadaEn)}
            actions={
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" isLoading={ocupado === 'wompi'} disabled={ocupado !== null} leftIcon={<RefreshCw aria-hidden className="h-4 w-4" />} onClick={() => void accion('wompi')}>
                  Consultar en Wompi
                </Button>
                {(s.estado === 'en_revision' || s.estado === 'pagada') && s.transaccionPagoId !== null && (
                  <Button isLoading={ocupado === 'orden'} disabled={ocupado !== null} leftIcon={<RotateCcw aria-hidden className="h-4 w-4" />} onClick={() => void accion('orden')}>
                    Reintentar crear el pedido
                  </Button>
                )}
              </div>
            }
          />

          <div aria-live="polite" className="space-y-3">
            {error !== null && <Alert variant="error">{error}</Alert>}
            {aviso !== null && <Alert variant="success">{aviso}</Alert>}
            {s.ultimoError !== null && (
              <Alert variant="warning" title="Por qué necesita revisión">
                {s.ultimoError}
              </Alert>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section aria-labelledby="titulo-datos" className="space-y-3 rounded-card border border-neutral-light/70 bg-neutral-white p-5 shadow-card">
              <h2 id="titulo-datos" className="font-title text-lg font-bold text-corporate">
                Datos de la compra
              </h2>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-neutral-medium">Pedido</dt>
                <dd className="font-semibold text-neutral-black">{s.codigoOrden ?? 'Sin pedido aún'}</dd>
                <dt className="text-neutral-medium">Entrega</dt>
                <dd className="text-neutral-black">{s.modoEntrega === 'domicilio' ? s.direccion : 'Recoge en el almacén'}</dd>
                <dt className="text-neutral-medium">Origen</dt>
                <dd className="text-neutral-black">{s.origen === 'cotizacion' ? 'Cotización aceptada' : 'Carrito'}</dd>
                <dt className="text-neutral-medium">Envío</dt>
                <dd className="text-neutral-black">{formatCOP(s.costoEnvio)}</dd>
                <dt className="text-neutral-medium">Total</dt>
                <dd className="font-title font-bold text-corporate">{formatCOP(s.totalACobrar)}</dd>
                <dt className="text-neutral-medium">Transacción aprobada</dt>
                <dd className="break-all text-neutral-black">{s.transaccionPagoId ?? '—'}</dd>
                <dt className="text-neutral-medium">Reintentos del pedido</dt>
                <dd className="text-neutral-black">{s.reintentosOrden}</dd>
              </dl>
            </section>

            <section aria-labelledby="titulo-intentos" className="space-y-3 rounded-card border border-neutral-light/70 bg-neutral-white p-5 shadow-card">
              <h2 id="titulo-intentos" className="font-title text-lg font-bold text-corporate">
                Intentos con Nequi
              </h2>
              {s.intentos.length === 0 ? (
                <p className="text-sm text-neutral-medium">Sin intentos de pago.</p>
              ) : (
                <ol className="divide-y divide-neutral-light text-sm">
                  {s.intentos.map((i) => (
                    <li key={i.numero} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <span className="font-medium text-neutral-black">
                        #{i.numero} · {i.celularEnmascarado}
                      </span>
                      <span className="text-neutral-dark">
                        {ETIQUETA_WOMPI[i.estadoWompi]} · {fechaHora(i.fecha)}
                      </span>
                      {i.motivo !== null && <span className="w-full text-xs text-neutral-medium">{i.motivo}</span>}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>

          <section aria-labelledby="titulo-lineas" className="overflow-x-auto rounded-card border border-neutral-light/70 bg-neutral-white shadow-card">
            <h2 id="titulo-lineas" className="sr-only">
              Productos
            </h2>
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-neutral-lightest text-left text-xs uppercase tracking-wide text-neutral-medium">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Producto</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Color · medida</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Cantidad</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-light">
                {s.lineas.map((l, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3 font-medium text-neutral-black">{l.nombreProducto}</td>
                    <td className="px-4 py-3 text-neutral-dark">{[l.color?.nombre, l.medida].filter(Boolean).join(' · ') || '—'}</td>
                    <td className="px-4 py-3 text-right text-neutral-dark">{l.cantidad}</td>
                    <td className="px-4 py-3 text-right font-semibold text-neutral-black">{formatCOP(l.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
