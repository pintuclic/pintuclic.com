'use client';

import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LogOut } from 'lucide-react';
import { Alert, Button, Modal, PasswordInput } from '@/core/components';
import { desactivarCuentaFormSchema, type DesactivarCuentaFormData } from '../../dtos/m04-cuentas.dto';
import { cerrarSesion, desactivarCuenta } from '../../services/cuentas.service';
import { aErrorCuentas } from '../../services/errores';
import { SeccionPerfil } from './SeccionPerfil';

export interface CuentaSectionProps {
  /** Se invoca cuando la sesión terminó en el servidor (cierre o desactivación). */
  onSesionTerminada: () => void;
}

/** Cierre de sesión y desactivación voluntaria de la cuenta. */
export function CuentaSection({ onSesionTerminada }: CuentaSectionProps) {
  const [cerrando, setCerrando] = useState(false);
  const [errorCierre, setErrorCierre] = useState<string | null>(null);
  const [confirmarAbierto, setConfirmarAbierto] = useState(false);
  const cerrarModal = useCallback(() => setConfirmarAbierto(false), []);

  const salir = async () => {
    setErrorCierre(null);
    setCerrando(true);
    try {
      await cerrarSesion();
      onSesionTerminada();
    } catch (error) {
      setErrorCierre(aErrorCuentas(error).mensaje);
    } finally {
      setCerrando(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <SeccionPerfil titulo="Cerrar sesión" descripcion="Sal de tu cuenta en este dispositivo.">
        {errorCierre && (
          <div className="mb-4">
            <Alert variant="error">{errorCierre}</Alert>
          </div>
        )}
        <Button
          type="button"
          variant="outline"
          isLoading={cerrando}
          leftIcon={<LogOut className="h-4 w-4" aria-hidden="true" />}
          onClick={salir}
        >
          Cerrar sesión
        </Button>
      </SeccionPerfil>

      <SeccionPerfil
        titulo="Desactivar cuenta"
        descripcion="Tu cuenta quedará inactiva y dejarás de poder iniciar sesión con ella."
      >
        <Button type="button" variant="danger" onClick={() => setConfirmarAbierto(true)}>
          Desactivar mi cuenta
        </Button>
      </SeccionPerfil>

      <Modal
        isOpen={confirmarAbierto}
        onClose={cerrarModal}
        size="sm"
        title="¿Desactivar tu cuenta?"
        subtitle="Escribe tu contraseña para confirmar. Esta acción cierra todas tus sesiones."
      >
        <ConfirmarDesactivacion onCancelar={cerrarModal} onDesactivada={onSesionTerminada} />
      </Modal>
    </div>
  );
}

function ConfirmarDesactivacion({ onCancelar, onDesactivada }: { onCancelar: () => void; onDesactivada: () => void }) {
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DesactivarCuentaFormData>({
    resolver: zodResolver(desactivarCuentaFormSchema),
    defaultValues: { contrasena: '' },
  });

  const enviar = handleSubmit(async ({ contrasena }) => {
    setErrorServidor(null);
    try {
      await desactivarCuenta(contrasena);
      onDesactivada();
    } catch (error) {
      setErrorServidor(aErrorCuentas(error).mensaje);
    }
  });

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
      {errorServidor && <Alert variant="error">{errorServidor}</Alert>}
      <PasswordInput
        id="desactivar-contrasena"
        label="Contraseña"
        autoComplete="current-password"
        error={errors.contrasena?.message}
        {...register('contrasena')}
      />
      <div className="flex flex-wrap justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" variant="danger" isLoading={isSubmitting}>
          Desactivar cuenta
        </Button>
      </div>
    </form>
  );
}
