'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Input, Modal, Select, Textarea } from '@/core/components';
import { formCuponSchema, type FormCupon } from '../dtos/formularios.dto';
import type { Cupon } from '../dtos/m06-precios.dto';
import { ETIQUETAS_AUDIENCIA } from '../services/etiquetas';
import { aCuerpoCupon, cuponVacio, formDesdeCupon } from '../services/formularios';
import { leerErrorPrecios } from '../services/mensaje-error';
import { cuponesApi } from '../services/precios-api';

export interface CuponModalProps {
  /** Cupón a editar; null crea uno nuevo. */
  cupon: Cupon | null;
  onClose: () => void;
  onGuardado: (texto: string) => void;
}

/** Alta y edición de un cupón. El código no se cambia una vez creado (R14). */
export const CuponModal: React.FC<CuponModalProps> = ({ cupon, onClose, onGuardado }) => {
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormCupon>({
    resolver: zodResolver(formCuponSchema),
    defaultValues: cupon === null ? cuponVacio() : formDesdeCupon(cupon),
  });
  const porcentaje = watch('tipoValor') === 'porcentaje';

  const guardar = handleSubmit(async (valores) => {
    setError(null);
    try {
      if (cupon === null) {
        const cuerpo = aCuerpoCupon(valores, 'crear');
        if (!cuerpo.ok) return setError(cuerpo.mensaje);
        const creado = await cuponesApi.crear(cuerpo.valor);
        onGuardado(`Cupón ${creado.codigo} creado.`);
      } else {
        const cuerpo = aCuerpoCupon(valores, 'editar');
        if (!cuerpo.ok) return setError(cuerpo.mensaje);
        const guardado = await cuponesApi.actualizar(cupon.idCupon, cuerpo.valor);
        onGuardado(`Cupón ${guardado.codigo} guardado.`);
      }
      onClose();
    } catch (err: unknown) {
      const e = leerErrorPrecios(err, 'No se pudo guardar el cupón.');
      setError(e.code === 'CODIGO_CUPON_DUPLICADO' ? 'Ya existe un cupón con ese código. Escriba otro.' : e.message);
    }
  });

  return (
    <Modal
      isOpen
      closeOnOutsideClick={false}
      onClose={onClose}
      title={cupon === null ? 'Nuevo cupón' : 'Editar cupón'}
      subtitle={cupon?.codigo}
      size="lg"
    >
      <form onSubmit={(e) => void guardar(e)} noValidate className="space-y-4 py-2">
        {error !== null && <Alert variant="error">{error}</Alert>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Código"
            {...register('codigo')}
            disabled={cupon !== null}
            error={errors.codigo?.message}
            helperText={
              cupon === null ? 'Lo escribe el cliente en el carrito. Se guarda en mayúsculas.' : 'No se puede cambiar.'
            }
          />
          <Input label="Nombre" {...register('nombre')} error={errors.nombre?.message} />
        </div>
        <Textarea
          label="Descripción (opcional)"
          rows={2}
          {...register('descripcion')}
          error={errors.descripcion?.message}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="Tipo de descuento"
            {...register('tipoValor')}
            options={[
              { value: 'porcentaje', label: 'Porcentaje' },
              { value: 'importe_fijo', label: 'Valor fijo en pesos' },
            ]}
          />
          <Input
            label={porcentaje ? 'Porcentaje' : 'Valor en pesos'}
            inputMode="decimal"
            {...register('valor')}
            error={errors.valor?.message}
            helperText={porcentaje ? 'Ej.: 10 o 7,5' : 'Se reparte entre los productos de la compra.'}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            label="Compra mínima (opcional)"
            inputMode="decimal"
            {...register('montoMinimoCompra')}
            helperText="En pesos, ya con otros descuentos."
          />
          <Input
            label="Usos en total (opcional)"
            inputMode="numeric"
            {...register('usosMaximos')}
            helperText="Vacío = sin límite."
          />
          <Input
            label="Usos por persona (opcional)"
            inputMode="numeric"
            {...register('usosPorUsuario')}
            helperText="Con límite exige iniciar sesión."
          />
        </div>
        <Select
          label="¿Para quién?"
          {...register('audiencia')}
          options={(Object.keys(ETIQUETAS_AUDIENCIA) as Array<keyof typeof ETIQUETAS_AUDIENCIA>).map((a) => ({
            value: a,
            label: ETIQUETAS_AUDIENCIA[a],
          }))}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Vigente desde"
            type="datetime-local"
            {...register('fechaInicio')}
            error={errors.fechaInicio?.message}
            helperText="Hora de Colombia."
          />
          <Input
            label="Vigente hasta (opcional)"
            type="datetime-local"
            {...register('fechaFin')}
            helperText="Vacío = sin fecha de fin."
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary-action" isLoading={isSubmitting}>
            {cupon === null ? 'Crear cupón' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
