import Link from 'next/link';
import { Clock } from 'lucide-react';
import { formatCOP } from '@/core/utils/moneda';
import type { OrdenFilaBandeja } from '../../dtos/m08-ordenes.dto';
import { ETIQUETA_MODO_ENTREGA, formatearDuracion, formatearFecha } from '../../services/presentacion';
import { EstadoBadge } from '../EstadoBadge';

/**
 * Fila de la bandeja (RF-ORD-05-05): identificador, cliente, fecha, total, modo de entrega, estado y
 * cuánto lleva en él, para decidir qué atender sin abrir cada orden.
 */
export function FilaBandeja({ orden }: { orden: OrdenFilaBandeja }) {
  return (
    <Link
      href={`/admin/pedidos/${orden.codigo}`}
      className="grid gap-2 rounded-card border border-neutral-light bg-neutral-white p-3 font-sans text-sm transition-colors hover:border-action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50 sm:grid-cols-[1.2fr_1.5fr_1fr_1fr_1.2fr_auto] sm:items-center"
    >
      <span className="font-title font-bold text-neutral-black">{orden.codigo}</span>
      <span className="truncate text-neutral-dark">{orden.cliente}</span>
      <span className="text-neutral-medium">
        <time dateTime={orden.fecha}>{formatearFecha(orden.fecha)}</time>
      </span>
      <span className="font-title font-semibold text-corporate">{formatCOP(orden.total)}</span>
      <span className="text-neutral-medium">{orden.modoEntrega ? ETIQUETA_MODO_ENTREGA[orden.modoEntrega] : '—'}</span>
      <span className="flex flex-wrap items-center gap-2">
        <EstadoBadge estado={orden.estado} />
        <span className="inline-flex items-center gap-1 text-xs text-neutral-medium" title="Tiempo en el estado actual">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          {formatearDuracion(orden.segundosEnEstado)}
        </span>
      </span>
    </Link>
  );
}
