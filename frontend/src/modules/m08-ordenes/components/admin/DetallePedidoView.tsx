'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, MapPin, Phone } from 'lucide-react';
import { AdminPageHeader, Alert, ButtonLink, Skeleton } from '@/core/components';
import { formatCOP } from '@/core/utils/moneda';
import { useGestionStore } from '../../store/gestionStore';
import { ETIQUETA_MODO_ENTREGA, formatearFecha } from '../../services/presentacion';
import { EstadoBadge } from '../EstadoBadge';
import { HistorialEstados } from '../HistorialEstados';
import { LineasOrdenLista } from '../LineasOrdenLista';
import { TotalesOrden } from '../TotalesOrden';
import { CambiarEstadoPanel } from './CambiarEstadoPanel';
import { NotasPanel } from './NotasPanel';

function Tarjeta({ id, titulo, children }: { id: string; titulo: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-card bg-neutral-white p-4 shadow-card">
      <h2 id={id} className="mb-3 font-title text-base font-bold text-neutral-black">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

/**
 * HU-ORD-09 · Todo lo necesario para atender un pedido en un solo sitio: contacto y dirección del
 * cliente, líneas con la base que consume cada color entonado, historial con autor, notas, contactos
 * y las compras anteriores del cliente. Desde aquí también se avanza el estado (HU-ORD-03).
 */
export function DetallePedidoView({ codigo }: { codigo: string }) {
  const { detalle, historialCliente, historialClienteError, cargandoDetalle, operando, error, aviso } = useGestionStore();
  const { abrirDetalle, cerrarDetalle, cambiarEstado, agregarNota } = useGestionStore.getState();

  useEffect(() => {
    void abrirDetalle(codigo);
    return () => cerrarDetalle();
  }, [codigo, abrirDetalle, cerrarDetalle]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={`Pedido ${codigo}`}
        subtitle="Detalle completo para atender el pedido."
        actions={
          <ButtonLink href="/admin/pedidos" variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Volver a pedidos
          </ButtonLink>
        }
      />

      {aviso && <Alert variant="success">{aviso}</Alert>}
      {error && <Alert variant="error">{error}</Alert>}
      {cargandoDetalle && !detalle && (
        <div className="space-y-4" aria-busy="true" aria-label="Cargando pedido">
          <Skeleton className="h-24" />
          <Skeleton className="h-48" />
        </div>
      )}

      {detalle && (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            <Tarjeta id="resumen" titulo="Resumen">
              <div className="flex flex-wrap items-center gap-3">
                <EstadoBadge estado={detalle.estado} />
                <span className="text-sm text-neutral-medium">
                  <time dateTime={detalle.fecha}>{formatearFecha(detalle.fecha)}</time>
                  {detalle.modoEntrega ? ` · ${ETIQUETA_MODO_ENTREGA[detalle.modoEntrega]}` : ''}
                  {detalle.codigoSolicitud ? ` · Solicitud ${detalle.codigoSolicitud}` : ''}
                </span>
              </div>
              {detalle.observaciones && <p className="mt-2 text-sm text-neutral-dark">{detalle.observaciones}</p>}
            </Tarjeta>

            <Tarjeta id="productos" titulo="Productos">
              <LineasOrdenLista lineas={detalle.lineas} />
              <div className="mt-4 border-t border-neutral-light pt-3">
                <TotalesOrden
                  subTotal={detalle.subTotal}
                  descuento={detalle.descuento}
                  costoEntrega={detalle.costoEntrega}
                  baseSinImpuesto={detalle.baseSinImpuesto}
                  tasaIva={detalle.tasaIva}
                  importeIva={detalle.importeIva}
                  total={detalle.total}
                />
              </div>
            </Tarjeta>

            <Tarjeta id="historial" titulo="Historial de estados">
              <HistorialEstados pasos={detalle.historial} />
            </Tarjeta>

            <Tarjeta id="notas" titulo="Notas internas">
              <NotasPanel notas={detalle.notas} operando={operando} onAgregar={(texto) => agregarNota({ texto })} />
            </Tarjeta>
          </div>

          <div className="space-y-6">
            <Tarjeta id="cliente" titulo="Cliente">
              <p className="font-title text-sm font-semibold text-neutral-black">{detalle.cliente.nombre}</p>
              <ul className="mt-2 space-y-1 text-sm text-neutral-dark">
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0 text-neutral-medium" aria-hidden="true" />
                  <a className="text-action hover:underline" href={`mailto:${detalle.cliente.correo}`}>
                    {detalle.cliente.correo}
                  </a>
                </li>
                {detalle.cliente.telefono && (
                  <li className="flex items-center gap-2">
                    <Phone className="h-4 w-4 shrink-0 text-neutral-medium" aria-hidden="true" />
                    <a className="text-action hover:underline" href={`tel:${detalle.cliente.telefono}`}>
                      {detalle.cliente.telefono}
                    </a>
                  </li>
                )}
                {detalle.direccion && (
                  <li className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-neutral-medium" aria-hidden="true" />
                    <span>{detalle.direccion}</span>
                  </li>
                )}
              </ul>
            </Tarjeta>

            {detalle.transicionesPermitidas.length > 0 && (
              <Tarjeta id="estado" titulo="Cambiar estado">
                <CambiarEstadoPanel orden={detalle} operando={operando} onCambiar={cambiarEstado} />
              </Tarjeta>
            )}

            <Tarjeta id="anteriores" titulo="Compras del cliente">
              {historialClienteError ? (
                <p role="alert" className="text-sm text-danger-hover">
                  No se pudo cargar el historial de compras del cliente. Vuelva a abrir el pedido para reintentar.
                </p>
              ) : historialCliente.length === 0 ? (
                <p className="text-sm text-neutral-medium">Sin otras compras registradas.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {historialCliente.map((o) => (
                    <li key={o.codigo} className="flex items-center justify-between gap-2">
                      <Link
                        href={`/admin/pedidos/${o.codigo}`}
                        aria-current={o.codigo === detalle.codigo ? 'page' : undefined}
                        className="font-title font-semibold text-action hover:underline"
                      >
                        {o.codigo}
                      </Link>
                      <span className="text-neutral-medium">{formatCOP(o.total)}</span>
                      <EstadoBadge estado={o.estado} />
                    </li>
                  ))}
                </ul>
              )}
            </Tarjeta>
          </div>
        </div>
      )}
    </div>
  );
}
