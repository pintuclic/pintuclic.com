'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Select } from '@/core/components';
import { ESTADOS_ORDEN } from '../../dtos/m08-ordenes.dto';
import {
  FILTROS_BANDEJA_VACIOS,
  filtrosBandejaFormSchema,
  type FiltrosBandejaForm as FiltrosBandejaValores,
} from '../../dtos/formularios.dto';
import type { FiltrosBandeja } from '../../interfaces/ordenes.interface';
import { aFiltrosBandeja } from '../../services/formularios';
import { ETIQUETA_ESTADO } from '../../services/presentacion';

const OPCIONES_ESTADO = [
  { value: '', label: 'Todos los estados' },
  ...ESTADOS_ORDEN.map((estado) => ({ value: estado, label: ETIQUETA_ESTADO[estado] })),
];

export interface FiltrosBandejaFormProps {
  onBuscar: (filtros: FiltrosBandeja) => void;
  onLimpiar: () => void;
  deshabilitado?: boolean;
}

/** HU-ORD-08: el empleado encuentra un pedido por el dato que el cliente le da (número, correo, teléfono). */
export function FiltrosBandejaForm({ onBuscar, onLimpiar, deshabilitado = false }: FiltrosBandejaFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FiltrosBandejaValores>({
    resolver: zodResolver(filtrosBandejaFormSchema),
    defaultValues: FILTROS_BANDEJA_VACIOS,
  });

  return (
    <form
      role="search"
      aria-label="Buscar pedidos"
      onSubmit={handleSubmit((valores) => onBuscar(aFiltrosBandeja(valores)))}
      className="grid gap-3 rounded-card bg-neutral-white p-4 shadow-card sm:grid-cols-2 lg:grid-cols-3"
    >
      <Input label="Número de pedido" placeholder="PC-2026-00001" error={errors.codigo?.message} {...register('codigo')} />
      <Input label="Correo del cliente" type="email" placeholder="cliente@correo.com" error={errors.correo?.message} {...register('correo')} />
      <Input label="Teléfono del cliente" type="tel" placeholder="3001234567" error={errors.telefono?.message} {...register('telefono')} />
      <Select label="Estado" options={OPCIONES_ESTADO} error={errors.estado?.message} {...register('estado')} />
      <Input label="Desde" type="date" error={errors.desde?.message} {...register('desde')} />
      <Input label="Hasta" type="date" error={errors.hasta?.message} {...register('hasta')} />

      <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
        <Button type="submit" disabled={deshabilitado}>
          Buscar
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={deshabilitado}
          onClick={() => {
            reset(FILTROS_BANDEJA_VACIOS);
            onLimpiar();
          }}
        >
          Limpiar
        </Button>
      </div>
    </form>
  );
}
