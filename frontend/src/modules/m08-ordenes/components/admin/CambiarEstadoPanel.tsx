'use client';

import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Select, Textarea } from '@/core/components';
import type { OrdenDetalleGestion } from '../../dtos/m08-ordenes.dto';
import { crearEsquemaCambioEstado, type CambioEstadoForm } from '../../dtos/formularios.dto';
import { aCambioEstado } from '../../services/formularios';
import { ETIQUETA_ESTADO } from '../../services/presentacion';

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
  const primero = orden.transicionesPermitidas[0];
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CambioEstadoForm>({
    resolver: zodResolver(esquema),
    defaultValues: { estadoNuevo: primero ?? orden.estado, motivo: '' },
  });

  // Al cambiar el estado de la orden cambian los pasos posibles: el formulario parte de cero.
  useEffect(() => {
    reset({ estadoNuevo: orden.transicionesPermitidas[0] ?? orden.estado, motivo: '' });
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
      <Select
        label="Pasar a"
        options={orden.transicionesPermitidas.map((e) => ({ value: e, label: ETIQUETA_ESTADO[e] }))}
        error={errors.estadoNuevo?.message}
        {...register('estadoNuevo')}
      />
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
