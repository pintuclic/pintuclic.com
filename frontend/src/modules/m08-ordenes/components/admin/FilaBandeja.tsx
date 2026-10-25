import { CalendarDays, Clock, Package, Truck } from 'lucide-react';
import { ButtonLink } from '@/core/components';
import { formatCOP } from '@/core/utils/moneda';
import type { OrdenFilaBandeja } from '../../dtos/m08-ordenes.dto';
import { ETIQUETA_MODO_ENTREGA, formatearDuracion, formatearFecha } from '../../services/presentacion';
import { EstadoBadge } from '../EstadoBadge';

/**
 * Pedido en la bandeja del personal, con la misma tarjeta que «Mis pedidos» del cliente (RF-ORD-05-05):
 * identificador, cliente, fecha, entrega, estado, cuánto lleva en él y total, para decidir qué atender
 * sin abrir cada orden.
 */
export function FilaBandeja({ orden }: { orden: OrdenFilaBandeja }) {
  return (
    <article className="flex flex-col gap-4 rounded-card bg-neutral-white p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <div
          aria-hidden="true"
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-card border border-neutral-light bg-neutral-lightest text-neutral-medium"
        >
          <Package className="h-7 w-7" />
        </div>
        <div className="min-w-0">
          <h2 className="truncate font-title text-base font-bold text-neutral-black">Pedido #{orden.codigo}</h2>
          <p className="truncate font-sans text-sm text-neutral-dark">{orden.cliente}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-medium">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
              <time dateTime={orden.fecha}>{formatearFecha(orden.fecha)}</time>
            </span>
            {orden.modoEntrega && (
              <span className="flex items-center gap-1.5">
                <Truck className="h-4 w-4 shrink-0" aria-hidden="true" />
                {ETIQUETA_MODO_ENTREGA[orden.modoEntrega]}
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:justify-center sm:gap-2">
        <EstadoBadge estado={orden.estado} />
        <p className="flex items-center gap-1 text-xs text-neutral-medium">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="sr-only">Lleva </span>
          {formatearDuracion(orden.segundosEnEstado)}
          <span className="sr-only"> en este estado</span>
        </p>
        <p className="text-right">
          <span className="block text-xs text-neutral-medium">Total</span>
          <span className="font-title text-lg font-bold text-corporate">{formatCOP(orden.total)}</span>
        </p>
        <ButtonLink href={`/admin/pedidos/${orden.codigo}`} variant="outline" size="sm">
          Ver detalle
        </ButtonLink>
      </div>
    </article>
  );
}
