import type { HistorialEstadoGestion, EstadoOrden } from '../dtos/m08-ordenes.dto';
import { ETIQUETA_ESTADO, formatearFechaHora } from '../services/presentacion';

export interface PasoHistorial {
  estadoNuevo: EstadoOrden;
  fecha: string;
  /** Solo la vista del personal (RF-ORD-09-01); el cliente no ve quién hizo cada cambio. */
  autor?: HistorialEstadoGestion['autor'];
  motivo?: HistorialEstadoGestion['motivo'];
}

/** Línea de tiempo de la orden: cada cambio de estado con su momento (RF-ORD-04-01). */
export function HistorialEstados({ pasos }: { pasos: ReadonlyArray<PasoHistorial> }) {
  return (
    <ol className="space-y-3 border-l-2 border-neutral-light pl-4">
      {pasos.map((paso, indice) => (
        <li key={`${paso.estadoNuevo}-${paso.fecha}-${indice}`} className="relative">
          <span aria-hidden="true" className="absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full bg-action" />
          <p className="font-title text-sm font-semibold text-neutral-black">{ETIQUETA_ESTADO[paso.estadoNuevo]}</p>
          <p className="text-xs text-neutral-medium">
            {formatearFechaHora(paso.fecha)}
            {paso.autor !== undefined ? ` · ${paso.autor ?? 'Sistema'}` : ''}
          </p>
          {paso.motivo && <p className="text-xs text-neutral-dark">Motivo: {paso.motivo}</p>}
        </li>
      ))}
    </ol>
  );
}
