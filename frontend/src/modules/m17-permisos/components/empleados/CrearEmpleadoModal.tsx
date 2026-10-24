'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, MailCheck, UserPlus } from 'lucide-react';
import { Button, Input, Modal } from '@/core/components';
import { crearEmpleadoDto, type CrearEmpleadoFormData } from '../../dtos/empleados.dto';
import { useEmpleadosStore } from '../../store/empleadosStore';

export interface CrearEmpleadoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CrearEmpleadoModal: React.FC<CrearEmpleadoModalProps> = ({ isOpen, onClose }) => {
  const { crearNuevoEmpleado, cargando, activacionCreada, limpiarActivacion } = useEmpleadosStore();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CrearEmpleadoFormData>({
    resolver: zodResolver(crearEmpleadoDto),
    defaultValues: {
      nombre: '',
      documento: '',
      correo: '',
      telefono: '',
    },
  });

  const onSubmit = async (data: CrearEmpleadoFormData) => {
    const ok = await crearNuevoEmpleado(data);
    if (ok) {
      reset();
    }
  };

  const handleCerrar = () => {
    limpiarActivacion();
    reset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCerrar}
      title={
        activacionCreada ? (
          <span className="flex items-center gap-2 text-conversion">
            <MailCheck className="w-5 h-5" /> Colaborador Creado con Éxito
          </span>
        ) : (
          <span className="flex items-center gap-2 text-corporate">
            <UserPlus className="w-5 h-5 text-action" /> Registrar Nuevo Colaborador
          </span>
        )
      }
      subtitle={
        activacionCreada
          ? 'El colaborador define su propia contraseña desde el correo.'
          : 'Ingresa los datos para registrar un colaborador en el sistema (HU-ADM-01).'
      }
      size="md"
      showRainbowStrip
    >
      {activacionCreada ? (
        /* HU-ADM-01: el enlace de activación sustituye a la credencial temporal */
        <div className="space-y-5 py-2">
          {activacionCreada.enviada ? (
            <div className="p-4 bg-conversion/10 border border-conversion/30 rounded-card">
              <p className="font-title font-semibold text-sm text-conversion-hover mb-1">
                Enlace de activación enviado
              </p>
              <p className="font-sans text-xs text-neutral-dark">
                Enviamos a <strong>{activacionCreada.correo}</strong> un enlace de un solo uso para que
                defina su contraseña. Vence según la vigencia configurada en Parámetros; si vence, puedes
                reenviarlo desde la lista de colaboradores.
              </p>
            </div>
          ) : (
            <div role="alert" className="p-4 bg-highlight/10 border border-highlight/30 rounded-card flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-highlight shrink-0 mt-0.5" />
              <p className="font-sans text-xs text-neutral-dark">
                El colaborador quedó creado, pero no pudimos enviar el correo a{' '}
                <strong>{activacionCreada.correo}</strong>. Usa “Reenviar enlace de activación” en la lista
                de colaboradores.
              </p>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button variant="primary-action" size="md" onClick={handleCerrar}>
              Entendido y Cerrar
            </Button>
          </div>
        </div>
      ) : (
        /* Formulario de Creación */
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <Input
            id="crear-nombre"
            label="Nombre Completo"
            placeholder="Ej: Laura Camila Gómez"
            required
            error={errors.nombre?.message}
            {...register('nombre')}
          />

          <Input
            id="crear-documento"
            label="Documento de Identidad (Cédula o Pasaporte)"
            placeholder="Ej: 1020304050"
            required
            error={errors.documento?.message}
            {...register('documento')}
          />

          <Input
            id="crear-correo"
            type="email"
            label="Correo Electrónico Corporativo"
            placeholder="colaborador@pintuclic.com"
            required
            error={errors.correo?.message}
            {...register('correo')}
          />

          <Input
            id="crear-telefono"
            label="Teléfono / Móvil"
            placeholder="+57 300 123 4567"
            required
            error={errors.telefono?.message}
            {...register('telefono')}
          />

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
              variant="primary-action"
              size="md"
              isLoading={cargando}
            >
              Registrar Colaborador
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
