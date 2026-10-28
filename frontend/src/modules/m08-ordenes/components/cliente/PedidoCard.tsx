import { CalendarDays, Package } from 'lucide-react';
import { ButtonLink } from '@/core/components';
import { formatCOP } from '@/core/utils/moneda';
import type { OrdenResumen } from '../../dtos/m08-ordenes.dto';
import { formatearFecha } from '../../services/presentacion';
import { EstadoBadge } from '../EstadoBadge';

/** Una compra en «Mis pedidos»: identificador, fecha, estado, total y acceso al detalle (RF-ORD-07-05). */
export function PedidoCard({ pedido }: { pedido: OrdenResumen }) {
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
          <h2 className="truncate font-title text-base font-bold text-neutral-black">Pedido #{pedido.codigo}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-neutral-medium">
            <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
            <time dateTime={pedido.fecha}>{formatearFecha(pedido.fecha)}</time>
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:justify-center sm:gap-2">
        <EstadoBadge estado={pedido.estado} />
        <p className="text-right">
          <span className="block text-xs text-neutral-medium">Total</span>
          <span className="font-title text-lg font-bold text-corporate">{formatCOP(pedido.total)}</span>
        </p>
        <ButtonLink href={`/perfil/pedidos/${pedido.codigo}`} variant="outline" size="sm">
          Ver detalle
        </ButtonLink>
      </div>
    </article>
  );
}
