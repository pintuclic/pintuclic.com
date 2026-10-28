'use client';

import { useEffect } from 'react';
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
  /** Filtros activos en la lista: el formulario los muestra siempre, aunque se haya salido y vuelto. */
  valores: FiltrosBandejaValores;
  onBuscar: (filtros: FiltrosBandeja) => void;
  onLimpiar: () => void;
  deshabilitado?: boolean;
}

/** HU-ORD-08: el empleado encuentra un pedido por el dato que el cliente le da (número, nombre, correo, teléfono). */
export function FiltrosBandejaForm({ valores, onBuscar, onLimpiar, deshabilitado = false }: FiltrosBandejaFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FiltrosBandejaValores>({
    resolver: zodResolver(filtrosBandejaFormSchema),
    defaultValues: valores,
  });

  // Los filtros viven en el store y sobreviven a la navegación: los campos se alinean con ellos.
  useEffect(() => {
    reset(valores);
  }, [valores, reset]);

  return (
    <form
      role="search"
      aria-label="Buscar pedidos"
      onSubmit={handleSubmit((datos) => onBuscar(aFiltrosBandeja(datos)))}
      className="grid gap-3 rounded-card bg-neutral-white p-4 shadow-card sm:grid-cols-2 lg:grid-cols-3"
    >
      <Input label="Número de pedido" placeholder="PC-2026-00001" error={errors.codigo?.message} {...register('codigo')} />
      <Input label="Nombre del cliente" placeholder="Laura" error={errors.nombre?.message} {...register('nombre')} />
      {/* Texto, no `email`: la búsqueda es parcial («laura@» o «gmail.com») y el navegador rechazaría esos valores. */}
      <Input
        label="Correo del cliente"
        type="text"
        inputMode="email"
        placeholder="cliente@correo.com"
        error={errors.correo?.message}
        {...register('correo')}
      />
      <Input label="Teléfono del cliente" type="tel" placeholder="3001234567" error={errors.telefono?.message} {...register('telefono')} />
      <Select label="Estado" options={OPCIONES_ESTADO} error={errors.estado?.message} {...register('estado')} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Desde" type="date" error={errors.desde?.message} {...register('desde')} />
        <Input label="Hasta" type="date" error={errors.hasta?.message} {...register('hasta')} />
      </div>

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
