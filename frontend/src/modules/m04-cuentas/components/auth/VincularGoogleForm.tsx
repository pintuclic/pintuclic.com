'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, PasswordInput, TextButton } from '@/core/components';
import { useAuthStore } from '@/core/store/authStore';
import { vincularGoogleFormSchema, type VincularGoogleFormData } from '../../dtos/m04-cuentas.dto';
import type { DatosVinculacionGooglePendiente, UsuarioResumen } from '../../interfaces/api.interfaces';
import { vincularCuentaGoogle } from '../../services/cuentas.service';
import { aErrorCuentas } from '../../services/errores';

export interface VincularGoogleFormProps {
  datosVinculacion: DatosVinculacionGooglePendiente;
  onCompletado: (usuario: UsuarioResumen) => void;
  onIrARecuperar: () => void;
  onVolver: () => void;
}

/**
 * Pide confirmación explícita con la contraseña actual antes de vincular Google a una cuenta existente.
 */
export function VincularGoogleForm({
  datosVinculacion,
  onCompletado,
  onIrARecuperar,
  onVolver,
}: VincularGoogleFormProps) {
  const establecerUsuario = useAuthStore((s) => s.establecerUsuario);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VincularGoogleFormData>({
    resolver: zodResolver(vincularGoogleFormSchema),
    defaultValues: { contrasena: '' },
  });

  const enviar = handleSubmit(async ({ contrasena }) => {
    setErrorServidor(null);
    try {
      const usuario = await vincularCuentaGoogle(datosVinculacion.tokenVinculacion, contrasena);
      establecerUsuario(usuario);
      onCompletado(usuario);
    } catch (error) {
      setErrorServidor(aErrorCuentas(error).mensaje);
    }
  });

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
      {errorServidor && <Alert variant="error">{errorServidor}</Alert>}

      <Alert variant="info">
        Encontramos una cuenta registrada con <span className="font-semibold">{datosVinculacion.email}</span>. Escribe
        tu contraseña actual para vincular tu acceso con Google.
      </Alert>

      <PasswordInput
        id="google-vincular-contrasena"
        label="Contraseña de tu cuenta"
        autoComplete="current-password"
        error={errors.contrasena?.message}
        {...register('contrasena')}
      />

      <TextButton onClick={onIrARecuperar} className="self-end text-sm">
        ¿Olvidaste tu contraseña?
      </TextButton>

      <Button type="submit" fullWidth isLoading={isSubmitting}>
        Vincular cuenta y entrar
      </Button>
      <Button type="button" variant="ghost" fullWidth onClick={onVolver}>
        Cancelar y volver
      </Button>
    </form>
  );
}

