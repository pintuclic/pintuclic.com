'use client';

import { useEffect } from 'react';
import { CheckCheck } from 'lucide-react';
import { Alert, Badge, Button, Skeleton } from '@/core/components';
import { formatearFechaHora } from '@/modules/m08-ordenes/services/presentacion';
import type { EstadoMarca, LineaVerificacion } from '../dtos/m09-cumplimiento.dto';
import { avisoDelEstado, ETIQUETA_ESTADO_LINEA, MARCAS, resumenAvance, varianteLinea } from '../services/presentacion';
import { useCumplimientoStore } from '../store/cumplimientoStore';

interface LineaChequeoProps {
  linea: LineaVerificacion;
  deshabilitado: boolean;
  onMarcar: (numeroLinea: number, estado: EstadoMarca) => void;
}

/** Un producto del pedido y las tres marcas posibles. Cada toque se guarda al instante (HU-CUM-01, incremental). */
export function LineaChequeo({ linea, deshabilitado, onMarcar }: LineaChequeoProps) {
  const ultima = linea.historial[linea.historial.length - 1];
  const nombre = `${linea.nombreProducto}, ${linea.varianteCopia}`;

  return (
    <li className="rounded-input border border-neutral-light p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-title text-sm font-semibold text-neutral-black">{linea.nombreProducto}</p>
          <p className="text-sm text-neutral-dark">
            {linea.varianteCopia} · {linea.cantidad} {linea.cantidad === 1 ? 'unidad' : 'unidades'}
          </p>
          {linea.colorSolicitado && <p className="text-xs text-neutral-medium">Color: {linea.colorSolicitado}</p>}
          {linea.baseConsumida && <p className="text-xs text-neutral-medium">Base que se usa: {linea.baseConsumida}</p>}
        </div>
        <Badge variant={varianteLinea(linea.estado)} pill>
          {ETIQUETA_ESTADO_LINEA[linea.estado]}
        </Badge>
      </div>

      <fieldset disabled={deshabilitado} className="mt-3">
        <legend className="sr-only">Disponibilidad de {nombre}</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {MARCAS.map((marca) => (
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
    </li>
  );
}

export interface PanelDisponibilidadProps {
  codigo: string;
  /** Se llama cuando una marca movió el pedido a preparación, para que el detalle del pedido se refresque. */
  onAvanzo: () => void;
}

/**
 * HU-CUM-01 y HU-CUM-03 · La revisión de disponibilidad dentro del detalle del pedido: una lista de chequeo y nada más.
 * Al dejar disponible la última línea, el pedido pasa solo a preparación; no hay botón de «terminar».
 */
export function PanelDisponibilidad({ codigo, onAvanzo }: PanelDisponibilidadProps) {
  const { verificacion, cargando, guardando, error, aviso } = useCumplimientoStore();
  const { cargar, marcar, marcarTodas, limpiar } = useCumplimientoStore.getState();

  useEffect(() => {
    void cargar(codigo);
    return () => limpiar();
  }, [codigo, cargar, limpiar]);

  const alMarcar = async (numeroLinea: number, estado: EstadoMarca): Promise<void> => {
    if (await marcar([{ numeroLinea, estado }])) onAvanzo();
  };
  const alMarcarTodas = async (): Promise<void> => {
    if (await marcarTodas('disponible')) onAvanzo();
  };

  return (
    <div className="space-y-3">
      {error && <Alert variant="error">{error}</Alert>}
      {aviso && <Alert variant="success">{aviso}</Alert>}
      {cargando && verificacion === null && (
        <div className="space-y-2" aria-busy="true" aria-label="Cargando la revisión">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      )}

      {verificacion && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-neutral-dark" aria-live="polite">
              {resumenAvance(verificacion)}
            </p>
            {verificacion.lineasSinConfirmar > 0 && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<CheckCheck className="h-4 w-4" aria-hidden="true" />}
                isLoading={guardando}
                onClick={() => void alMarcarTodas()}
              >
                Marcar todos como disponibles
              </Button>
            )}
          </div>

          <ul className="space-y-2">
            {verificacion.lineas.map((linea) => (
              <LineaChequeo key={linea.numeroLinea} linea={linea} deshabilitado={guardando} onMarcar={(n, e) => void alMarcar(n, e)} />
            ))}
          </ul>

          <p className="text-xs text-neutral-medium">{avisoDelEstado(verificacion.estado)}</p>
        </>
      )}
    </div>
  );
}
