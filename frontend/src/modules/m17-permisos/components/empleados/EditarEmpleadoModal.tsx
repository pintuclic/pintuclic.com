'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserCheck } from 'lucide-react';
import { Button, Input, Modal } from '@/core/components';
import { editarEmpleadoDto, type EditarEmpleadoFormData } from '../../dtos/empleados.dto';
import type { ResumenEmpleado } from '../../interfaces/empleados.interface';
import { useEmpleadosStore } from '../../store/empleadosStore';

export interface EditarEmpleadoModalProps {
  empleado: ResumenEmpleado | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EditarEmpleadoModal: React.FC<EditarEmpleadoModalProps> = ({
  empleado,
  isOpen,
  onClose,
}) => {
  const { actualizarEmpleado, cargando } = useEmpleadosStore();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditarEmpleadoFormData>({
    resolver: zodResolver(editarEmpleadoDto),
    defaultValues: {
      nombre: empleado?.nombre || '',
      telefono: empleado?.telefono || '',
    },
  });

  useEffect(() => {
    if (empleado) {
      reset({
        nombre: empleado.nombre,
        telefono: empleado.telefono || '',
      });
    }
  }, [empleado, reset]);

  if (!empleado) return null;

  const onSubmit = async (data: EditarEmpleadoFormData) => {
    // El contrato del backend acepta que `telefono` esté ausente, pero no que
    // llegue vacío. Un colaborador sin teléfono se edita omitiendo el campo.
    const cambios: EditarEmpleadoFormData = {
      nombre: data.nombre,
      telefono: data.telefono?.trim() ? data.telefono.trim() : undefined,
    };
    const ok = await actualizarEmpleado(empleado.idUsuario, cambios);
    if (ok) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2 text-corporate">
          <UserCheck className="w-5 h-5 text-action" /> Editar Datos del Colaborador
        </span>
      }
      subtitle={`Modificando información para ${empleado.correo}`}
      size="md"
      showRainbowStrip
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
        <Input
          id="editar-nombre"
          label="Nombre Completo"
          required
          error={errors.nombre?.message}
          {...register('nombre')}
        />

        <Input
          id="editar-telefono"
          label="Teléfono / Móvil"
          error={errors.telefono?.message}
          {...register('telefono')}
        />

        <div className="p-3 bg-neutral-lightest border border-neutral-light rounded-btn text-xs text-neutral-medium">
          <span className="font-semibold text-neutral-dark">Nota de integridad: </span>
          Por directivas de gobernanza (HU-CUE-08), el correo electrónico y el documento de
          identidad no pueden modificarse desde este formulario.
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-light/50">
          <Button type="button" variant="outline" size="md" onClick={onClose} disabled={cargando}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary-action" size="md" isLoading={cargando}>
            Guardar Cambios
          </Button>
        </div>
      </form>
    </Modal>
  );
};
