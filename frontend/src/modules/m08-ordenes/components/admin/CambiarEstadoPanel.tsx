'use client';

import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Textarea } from '@/core/components';
import { ESTADOS_ORDEN, type EstadoOrden, type OrdenDetalleGestion } from '../../dtos/m08-ordenes.dto';
import { crearEsquemaCambioEstado, type CambioEstadoForm } from '../../dtos/formularios.dto';
import { aCambioEstado } from '../../services/formularios';
import { ETIQUETA_ESTADO } from '../../services/presentacion';

type Paso = OrdenDetalleGestion['transicionesPermitidas'][number];

/**
 * Estados que se listan, en orden. Cancelado y devuelto quedan fuera (esperan la política de M11) y «Orden
 * confirmada» solo sale en las órdenes anteriores que aún están en él: ninguna orden nueva pasa por ahí.
 */
function estadosVisibles(actual: EstadoOrden): EstadoOrden[] {
  return ESTADOS_ORDEN.filter(
    (e) => e !== 'cancelado' && e !== 'devuelto' && (e !== 'orden_confirmada' || actual === 'orden_confirmada'),
  );
}

/** Retroceder de preparada a en preparación es la excepción: el avance es la opción que se marca de entrada. */
function pasoInicial(estado: OrdenDetalleGestion['estado'], pasos: readonly Paso[]): Paso | undefined {
  return pasos.find((p) => !(estado === 'preparada' && p === 'en_preparacion')) ?? pasos[0];
}

export interface CambiarEstadoPanelProps {
  orden: Pick<OrdenDetalleGestion, 'estado' | 'transicionesPermitidas'>;
  operando: boolean;
  onCambiar: (cambio: ReturnType<typeof aCambioEstado>) => Promise<boolean>;
}

/**
 * HU-ORD-03 · Hace avanzar la orden. Solo ofrece los pasos que el servidor declara permitidos hoy
 * (`transicionesPermitidas`); cancelar y devolver no aparecen porque esperan la política de M11.
 */
export function CambiarEstadoPanel({ orden, operando, onCambiar }: CambiarEstadoPanelProps) {
  const esquema = useMemo(() => crearEsquemaCambioEstado(orden.estado), [orden.estado]);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CambioEstadoForm>({
    resolver: zodResolver(esquema),
    defaultValues: { estadoNuevo: pasoInicial(orden.estado, orden.transicionesPermitidas) ?? orden.estado, motivo: '' },
  });

  // Al cambiar el estado de la orden cambian los pasos posibles: el formulario parte de cero.
  useEffect(() => {
    reset({ estadoNuevo: pasoInicial(orden.estado, orden.transicionesPermitidas) ?? orden.estado, motivo: '' });
  }, [orden.estado, orden.transicionesPermitidas, reset]);

  // Sin pasos posibles no hay nada que ofrecer: quien lo monta oculta la tarjeta entera.
  if (orden.transicionesPermitidas.length === 0) return null;

  const requiereMotivo = orden.estado === 'preparada' && watch('estadoNuevo') === 'en_preparacion';

  return (
    <form
      onSubmit={handleSubmit(async (valores) => {
        await onCambiar(aCambioEstado(orden.estado, valores));
      })}
      className="space-y-3"
    >
      <fieldset className="space-y-2">
        <legend className="mb-1.5 font-title text-sm font-medium text-neutral-dark">Pasar a</legend>
        {estadosVisibles(orden.estado).map((estado) => {
          const esActual = estado === orden.estado;
          const habilitado = orden.transicionesPermitidas.includes(estado);
          return (
            <label
              key={estado}
              className={`flex min-h-[44px] items-center gap-3 rounded-input border border-neutral-light px-3.5 py-2.5 text-sm has-[:checked]:border-action has-[:checked]:bg-action/5 ${
                habilitado ? 'cursor-pointer text-neutral-dark' : 'cursor-not-allowed text-neutral-medium'
              } ${esActual ? 'bg-neutral-lightest' : ''}`}
            >
              <input
                type="radio"
                value={estado}
                disabled={!habilitado}
                className="h-4 w-4 accent-action"
                {...register('estadoNuevo')}
              />
              <span className="flex-1">{ETIQUETA_ESTADO[estado]}</span>
              {esActual && <span className="text-xs font-semibold text-corporate">Estado actual</span>}
            </label>
          );
        })}
        {errors.estadoNuevo?.message && <p className="text-xs text-danger">{errors.estadoNuevo.message}</p>}
        <p className="text-xs text-neutral-medium">Solo se pueden elegir los pasos habilitados desde el estado actual.</p>
      </fieldset>
      {(requiereMotivo || watch('motivo') !== '') && (
        <Textarea
          label={requiereMotivo ? 'Motivo (obligatorio)' : 'Motivo'}
          rows={2}
          error={errors.motivo?.message}
          {...register('motivo')}
        />
      )}
      <Button type="submit" isLoading={operando}>
        Cambiar estado
      </Button>
    </form>
  );
}
