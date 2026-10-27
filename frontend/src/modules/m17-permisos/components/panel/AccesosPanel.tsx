import React from 'react';
import Link from 'next/link';
import { Boxes, Building2, ClipboardList, Headset, Megaphone, Package, Percent, UserCheck, Users } from 'lucide-react';
import type { AccesoPanel, ClaveAccesoPanel } from '../../dtos/m17-panel-resumen.dto';

const ICONO: Record<ClaveAccesoPanel, { icono: React.ReactNode; color: string }> = {
  responder_cotizaciones: { icono: <ClipboardList className="h-5 w-5" aria-hidden="true" />, color: 'bg-highlight/25 text-neutral-black' },
  crear_producto: { icono: <Package className="h-5 w-5" aria-hidden="true" />, color: 'bg-subaction text-action' },
  ajustar_inventario: { icono: <Boxes className="h-5 w-5" aria-hidden="true" />, color: 'bg-conversion/15 text-conversion-hover' },
  crear_promocion: { icono: <Percent className="h-5 w-5" aria-hidden="true" />, color: 'bg-danger/10 text-danger' },
  gestionar_campanias: { icono: <Megaphone className="h-5 w-5" aria-hidden="true" />, color: 'bg-subaction text-corporate' },
  atender_solicitudes: { icono: <Headset className="h-5 w-5" aria-hidden="true" />, color: 'bg-conversion/15 text-conversion-hover' },
  validar_empresas: { icono: <Building2 className="h-5 w-5" aria-hidden="true" />, color: 'bg-subaction text-action' },
  ver_clientes: { icono: <UserCheck className="h-5 w-5" aria-hidden="true" />, color: 'bg-highlight/25 text-neutral-black' },
  gestionar_colaboradores: { icono: <Users className="h-5 w-5" aria-hidden="true" />, color: 'bg-subaction text-corporate' },
};

export interface AccesosPanelProps {
  accesos: readonly AccesoPanel[];
}

/** Atajos a lo que la persona puede hacer (el servidor decide cuáles ve). */
export const AccesosPanel: React.FC<AccesosPanelProps> = ({ accesos }) => (
  <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
    {accesos.map((a) => (
      <li key={a.clave} className="flex">
        <Link
          href={a.ruta}
          className="group flex w-full items-start gap-3 rounded-card border border-neutral-light/70 bg-neutral-white p-4 shadow-card transition-all hover:border-action/40 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50"
        >
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-card ${ICONO[a.clave].color}`}>{ICONO[a.clave].icono}</span>
          <span className="min-w-0">
            <span className="block font-title text-sm font-bold leading-snug text-corporate group-hover:text-action">{a.etiqueta}</span>
            <span className="mt-0.5 block font-sans text-xs leading-relaxed text-neutral-medium">{a.descripcion}</span>
          </span>
        </Link>
      </li>
    ))}
  </ul>
);
