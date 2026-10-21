'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Copy, KeyRound, ShieldAlert, UserPlus } from 'lucide-react';
import { Button, Input, Modal } from '@/core/components';
import { crearEmpleadoDto, type CrearEmpleadoFormData } from '../../dtos/empleados.dto';
import { useEmpleadosStore } from '../../store/empleadosStore';

export interface CrearEmpleadoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CrearEmpleadoModal: React.FC<CrearEmpleadoModalProps> = ({ isOpen, onClose }) => {
  const { crearNuevoEmpleado, cargando, credencialTemporalGenerada, limpiarCredencialTemporal } =
    useEmpleadosStore();
  const [copiado, setCopiado] = useState(false);
  const [errorCopia, setErrorCopia] = useState<string | null>(null);

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
    limpiarCredencialTemporal();
    reset();
    setCopiado(false);
    setErrorCopia(null);
    onClose();
  };

  /**
   * HU-SEG-06: la credencial temporal es de un solo uso y no puede volver a
   * consultarse. Mientras está en pantalla, cerrar con Escape o con un clic en
   * el fondo la destruiría sin aviso, así que ambos caminos se desactivan y
   * solo el botón explícito "Entendido y Cerrar" la descarta.
   */
  const credencialVisible = credencialTemporalGenerada !== null;

  const cierreIgnorado = () => {
    // Intencionalmente vacío: ver `credencialVisible`.
  };

  const copiarCredencial = async () => {
    if (!credencialTemporalGenerada) return;
    try {
      await navigator.clipboard.writeText(credencialTemporalGenerada);
      setCopiado(true);
      setErrorCopia(null);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // El portapapeles falla en contexto no seguro o sin permiso. Callarlo
      // deja al usuario creyendo que copió una clave irrecuperable.
      setErrorCopia('No se pudo copiar. Selecciona la credencial y cópiala manualmente.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={credencialVisible ? cierreIgnorado : handleCerrar}
      closeOnOutsideClick={!credencialVisible}
      title={
        credencialTemporalGenerada ? (
          <span className="flex items-center gap-2 text-conversion">
            <KeyRound className="w-5 h-5" /> Colaborador Creado con Éxito
          </span>
        ) : (
          <span className="flex items-center gap-2 text-corporate">
            <UserPlus className="w-5 h-5 text-action" /> Registrar Nuevo Colaborador
          </span>
        )
      }
      subtitle={
        credencialTemporalGenerada
          ? 'Guarda la credencial temporal para entregarla al colaborador.'
          : 'Ingresa los datos para registrar un colaborador en el sistema (HU-ADM-01).'
      }
      size="md"
      showRainbowStrip
    >
      {credencialTemporalGenerada ? (
        /* Vista de Credencial Temporal Generada */
        <div className="space-y-5 py-2">
          <div className="p-4 bg-conversion/10 border border-conversion/30 rounded-card">
            <p className="font-title font-semibold text-sm text-conversion-hover mb-1">
              Credencial Temporal de Acceso
            </p>
            <p className="font-sans text-xs text-neutral-dark mb-3">
              Esta credencial es de un solo uso. El colaborador estará obligado a cambiarla en su
              primer inicio de sesión para activar su cuenta.
            </p>

            <div className="flex items-center gap-2 p-2.5 bg-neutral-white border border-neutral-light rounded-btn font-mono text-sm text-neutral-black font-bold justify-between">
              <span className="tracking-wider">{credencialTemporalGenerada}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={copiarCredencial}
                leftIcon={copiado ? <Check className="w-3.5 h-3.5 text-conversion" /> : <Copy className="w-3.5 h-3.5" />}
                className="py-1 px-2.5 min-h-[32px] text-xs"
              >
                {copiado ? 'Copiado' : 'Copiar'}
              </Button>
            </div>

            {errorCopia && (
              <p role="alert" className="mt-2 font-sans text-xs text-danger">
                {errorCopia}
              </p>
            )}
          </div>

          <div className="p-3 bg-neutral-lightest border border-neutral-light/70 rounded-btn flex items-start gap-2.5 text-xs text-neutral-medium">
            <ShieldAlert className="w-4 h-4 text-highlight shrink-0 mt-0.5" />
            <span>
              Por directiva de seguridad HU-SEG-06, esta clave temporal nunca se almacena en texto
              plano y no podrá ser consultada nuevamente una vez cerrado este diálogo.
            </span>
          </div>

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
