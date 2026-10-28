'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Input, Modal } from '@/core/components';
import { formTipoClienteSchema, type FormTipoCliente } from '../dtos/formularios.dto';
import type { TipoClienteEmpresa } from '../dtos/m06-precios.dto';
import { aCuerpoTipoCliente, formDesdeTipo, tipoClienteVacio } from '../services/formularios';
import { leerErrorPrecios } from '../services/mensaje-error';
import { tiposClienteApi } from '../services/precios-api';

export interface TipoClienteModalProps {
  /** Tipo a editar; null crea uno nuevo. */
  tipo: TipoClienteEmpresa | null;
  onClose: () => void;
  onGuardado: (texto: string) => void;
}

/** Alta y edición de un tipo de cliente empresa (Proveedor, Constructora…) con su descuento. */
export const TipoClienteModal: React.FC<TipoClienteModalProps> = ({ tipo, onClose, onGuardado }) => {
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormTipoCliente>({
    resolver: zodResolver(formTipoClienteSchema),
    defaultValues: tipo === null ? tipoClienteVacio() : formDesdeTipo(tipo),
  });

  const guardar = handleSubmit(async (valores) => {
    setError(null);
    const cuerpo = aCuerpoTipoCliente(valores);
    if (!cuerpo.ok) return setError(cuerpo.mensaje);
    try {
      const r =
        tipo === null
          ? await tiposClienteApi.crear(cuerpo.valor)
          : await tiposClienteApi.actualizar(tipo.idSubRolEmpresa, cuerpo.valor);
      onGuardado(tipo === null ? `Tipo "${r.nombre}" creado.` : `Tipo "${r.nombre}" guardado.`);
      onClose();
    } catch (err: unknown) {
      const e = leerErrorPrecios(err, 'No se pudo guardar el tipo de cliente.');
      setError(e.code === 'NOMBRE_TIPO_CLIENTE_DUPLICADO' ? 'Ya existe un tipo de cliente con ese nombre.' : e.message);
    }
  });

  return (
    <Modal
      isOpen
      closeOnOutsideClick={false}
      onClose={onClose}
      title={tipo === null ? 'Nuevo tipo de cliente empresa' : 'Editar tipo de cliente empresa'}
      subtitle={tipo?.nombre}
      size="md"
    >
      <form onSubmit={(e) => void guardar(e)} noValidate className="space-y-4 py-2">
        {error !== null && <Alert variant="error">{error}</Alert>}
        <Input
          label="Nombre"
          {...register('nombre')}
          error={errors.nombre?.message}
          helperText='Ej.: "Proveedor", "Constructora".'
        />
        <Input
          label="Porcentaje de descuento"
          inputMode="decimal"
          {...register('porcentaje')}
          error={errors.porcentaje?.message}
          helperText="Ej.: 15 o 12,5. Se aplica a todo el carrito, después de los eventos."
        />
        <Input
          label="Compra mínima para el descuento (opcional)"
          inputMode="decimal"
          {...register('montoMinimoCompra')}
          helperText="En pesos, IVA incluido y ya con los eventos. Si el carrito no llega, no se aplica y se le avisa al cliente cuánto le falta. Vacío = sin mínimo."
        />
        <Input
          label="Tope de ahorro por compra (opcional)"
          inputMode="decimal"
          {...register('tope')}
          helperText="Lo máximo que puede ahorrar una compra con este descuento, en pesos. Vacío = sin tope."
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary-action" isLoading={isSubmitting}>
            {tipo === null ? 'Crear tipo' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
