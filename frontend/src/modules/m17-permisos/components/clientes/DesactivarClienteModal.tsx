'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Power } from 'lucide-react';
import { Badge, Button, Checkbox, Modal, Textarea } from '@/core/components';
import {
  desactivarClienteDto,
  type DesactivarClienteFormData,
} from '../../dtos/clientes-admin.dto';
import type {
  ClienteResumen,
  FichaClienteRespuesta,
} from '../../interfaces/clientes-admin.interface';
import { useClientesStore } from '../../store/clientesStore';

export interface DesactivarClienteModalProps {
  cliente: ClienteResumen | FichaClienteRespuesta | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DesactivarClienteModal: React.FC<DesactivarClienteModalProps> = ({
  cliente,
  isOpen,
  onClose,
}) => {
  const { desactivar, cargando } = useClientesStore();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DesactivarClienteFormData>({
    resolver: zodResolver(desactivarClienteDto),
    defaultValues: {
      motivo: '',
      confirmacion: undefined,
    },
  });

  const confirmacionMarcada = watch('confirmacion');

  if (!cliente) return null;

  const onSubmit = async (data: DesactivarClienteFormData) => {
    const ok = await desactivar(cliente.idUsuario, data.motivo);
    if (ok) {
      reset();
      onClose();
    }
  };

  const handleCerrar = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCerrar}
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-danger/10 border border-danger/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-danger" />
          </div>
          <div>
            <h3 className="font-title font-semibold text-lg text-neutral-black leading-snug">
              ¿Desactivar cuenta de cliente?
            </h3>
            <p className="font-sans text-xs text-neutral-medium">
              Esta acción requiere registrar un motivo justificado obligatorio (HU-ADM-05 / RN-ADM-08).
            </p>
          </div>
        </div>
      }
      size="md"
      showRainbowStrip
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
        {/* Resumen del cliente */}
        <div className="p-3.5 bg-neutral-lightest border border-neutral-light/70 rounded-card flex items-center justify-between">
          <div>
            <p className="font-title font-semibold text-sm text-neutral-black">
              {cliente.nombre}
            </p>
            <p className="font-sans text-xs text-neutral-medium">{cliente.correo}</p>
          </div>
          <Badge variant="neutral">
            Tipo: {cliente.tipo}
          </Badge>
        </div>

        {/* Campo Obligatorio: Motivo de desactivación */}
        <Textarea
          id="motivo-desactivacion"
          label="Motivo justificado de desactivación"
          required
          rows={3}
          placeholder="Describa la causa administrativa de la suspensión (mínimo 5 caracteres)..."
          error={errors.motivo?.message}
          {...register('motivo')}
        />

        {/* Checkbox de confirmación obligatoria */}
        <div className="pt-1">
          <Checkbox
            id="confirmar-cliente"
            label={
              <span className="text-xs text-neutral-dark font-medium">
                Confirmo que he verificado la solicitud y asumo la responsabilidad de suspender esta
                cuenta en la plataforma.
              </span>
            }
            checked={Boolean(confirmacionMarcada)}
            onChange={(e) =>
              setValue('confirmacion', e.target.checked as true, { shouldValidate: true })
            }
            error={errors.confirmacion?.message}
          />
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-light/50">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={handleCerrar}
            disabled={cargando}
          >
            Cancelar
          </Button>

          <Button
            type="submit"
            variant="danger"
            size="md"
            isLoading={cargando}
            leftIcon={<Power className="w-4 h-4" />}
          >
            Suspender Cliente
          </Button>
        </div>
      </form>
    </Modal>
  );
};
