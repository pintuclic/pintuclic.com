'use client';

import { formatearFechaHora } from '@/modules/m08-ordenes/services/presentacion';
import type { EstadoMarca, LineaVerificacion } from '../dtos/m09-cumplimiento.dto';
import { marcasDisponibles } from '../services/presentacion';
import { useCumplimientoStore } from '../store/cumplimientoStore';
import type { EstadoOrden } from '../dtos/m09-cumplimiento.dto';

export interface OpcionesDeLineaProps {
  linea: LineaVerificacion;
  estadoOrden: EstadoOrden;
  deshabilitado: boolean;
  onMarcar: (numeroLinea: number, estado: EstadoMarca) => void;
}

/**
 * Las opciones de un producto del pedido y quién lo marcó. Cada toque se guarda al instante (HU-CUM-01, incremental).
 * El nombre, la presentación y el estado del producto no se repiten aquí: ya están en la lista de productos del pedido.
 */
export function OpcionesDeLinea({ linea, estadoOrden, deshabilitado, onMarcar }: OpcionesDeLineaProps) {
  const ultima = linea.historial[linea.historial.length - 1];
  const nombre = `${linea.nombreProducto}, ${linea.varianteCopia}`;
  const opciones = marcasDisponibles(estadoOrden, linea.estado);

  return (
    <div className="mt-2">
      {linea.baseConsumida && <p className="mb-2 text-xs text-neutral-medium">Base que se usa: {linea.baseConsumida}</p>}

      <fieldset disabled={deshabilitado}>
        <legend className="sr-only">Disponibilidad de {nombre}</legend>
        <div className={`grid gap-2 ${opciones.length > 3 ? 'sm:grid-cols-4' : opciones.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
          {opciones.map((marca) => (
            <label
              key={marca.valor}
              className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-input border border-neutral-light px-3 py-2 text-sm text-neutral-dark has-[:checked]:border-action has-[:checked]:bg-action/5 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-action has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
            >
              <input
                type="radio"
                name={`linea-${linea.numeroLinea}`}
                value={marca.valor}
                checked={linea.estado === marca.valor}
                onChange={() => onMarcar(linea.numeroLinea, marca.valor)}
                className="h-4 w-4 accent-action"
              />
              <span>{marca.etiqueta}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {ultima && (
        <p className="mt-2 text-xs text-neutral-medium">
          Marcado por {ultima.autor} · <time dateTime={ultima.fecha}>{formatearFechaHora(ultima.fecha)}</time>
          {linea.historial.length > 1 ? ` · ${linea.historial.length - 1} ${linea.historial.length === 2 ? 'cambio anterior' : 'cambios anteriores'}` : ''}
        </p>
      )}
    </div>
  );
}

/** Lo que se añade bajo un producto de la lista del pedido mientras se revisa o se prepara (`LineasOrdenLista.controles`). */
export function ControlesLinea({ numeroLinea }: { numeroLinea: number }) {
  const verificacion = useCumplimientoStore((s) => s.verificacion);
  const guardando = useCumplimientoStore((s) => s.guardando);
  const linea = verificacion?.lineas.find((l) => l.numeroLinea === numeroLinea);
  if (!verificacion || !linea) return null;

  return (
    <OpcionesDeLinea
      linea={linea}
      estadoOrden={verificacion.estado}
      deshabilitado={guardando}
      onMarcar={(n, estado) => void useCumplimientoStore.getState().marcar([{ numeroLinea: n, estado }])}
    />
  );
}
