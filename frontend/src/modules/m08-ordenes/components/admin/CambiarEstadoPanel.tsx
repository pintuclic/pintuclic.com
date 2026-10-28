'use client';

import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Textarea } from '@/core/components';
import type { OrdenDetalleGestion } from '../../dtos/m08-ordenes.dto';
import { crearEsquemaCambioEstado, type CambioEstadoForm } from '../../dtos/formularios.dto';
import { aCambioEstado } from '../../services/formularios';
import { ETIQUETA_ESTADO } from '../../services/presentacion';

type Paso = OrdenDetalleGestion['transicionesPermitidas'][number];

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
        {orden.transicionesPermitidas.map((paso) => (
          <label
            key={paso}
            className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-input border border-neutral-light px-3.5 py-2.5 text-sm text-neutral-dark has-[:checked]:border-action has-[:checked]:bg-action/5"
          >
            <input type="radio" value={paso} className="h-4 w-4 accent-action" {...register('estadoNuevo')} />
            {ETIQUETA_ESTADO[paso]}
          </label>
        ))}
        {errors.estadoNuevo?.message && <p className="text-xs text-danger">{errors.estadoNuevo.message}</p>}
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
