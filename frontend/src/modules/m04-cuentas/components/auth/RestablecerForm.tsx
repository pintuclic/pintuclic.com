'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, ButtonLink, PasswordInput } from '@/core/components';
import {
  restablecerPasswordFormSchema,
  type RestablecerPasswordFormData,
} from '../../dtos/m04-cuentas.dto';
import { restablecerContrasena } from '../../services/cuentas.service';
import { aErrorCuentas } from '../../services/errores';

/**
 * HU-CUE-05 · Restablecer contraseña desde el enlace del correo.
 * RN-CUE-09: no inicia sesión automáticamente; el backend invalida las sesiones
 * abiertas y el usuario entra de nuevo con su contraseña nueva.
 */
export function RestablecerForm({ token }: { token: string | null }) {
  const [listo, setListo] = useState(false);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RestablecerPasswordFormData>({
    resolver: zodResolver(restablecerPasswordFormSchema),
    defaultValues: { nuevaContrasena: '', confirmarNuevaContrasena: '' },
  });

  if (!token) {
    return (
      <div className="flex flex-col gap-4">
        <Alert variant="error">
          El enlace no es válido o está incompleto. Solicita uno nuevo para restablecer tu contraseña.
        </Alert>
        <ButtonLink href="/recuperar-contrasena" fullWidth>
          Solicitar un enlace nuevo
        </ButtonLink>
      </div>
    );
  }

  if (listo) {
    return (
      <div className="flex flex-col gap-4">
        <Alert variant="success">
          Tu contraseña fue actualizada. Por seguridad cerramos tus sesiones abiertas: inicia sesión con tu
          contraseña nueva.
        </Alert>
        <ButtonLink href="/login" fullWidth>
          Iniciar sesión
        </ButtonLink>
      </div>
    );
  }

  const enviar = handleSubmit(async ({ nuevaContrasena }) => {
    setErrorServidor(null);
    try {
      await restablecerContrasena(token, nuevaContrasena);
      setListo(true);
    } catch (error) {
      setErrorServidor(aErrorCuentas(error).mensaje);
    }
  });

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
      {errorServidor && (
        <Alert variant="error">
          {errorServidor}{' '}
          <Link href="/recuperar-contrasena" className="font-medium underline">
            Solicitar un enlace nuevo
          </Link>
        </Alert>
      )}
      <PasswordInput
        id="restablecer-nueva"
        label="Nueva contraseña"
        autoComplete="new-password"
        placeholder="Mínimo 12 caracteres"
        helperText="Entre 12 y 128 caracteres."
        error={errors.nuevaContrasena?.message}
        {...register('nuevaContrasena')}
      />
      <PasswordInput
        id="restablecer-confirmar"
        label="Confirmar contraseña"
        autoComplete="new-password"
        error={errors.confirmarNuevaContrasena?.message}
        {...register('confirmarNuevaContrasena')}
      />
      <Button type="submit" fullWidth isLoading={isSubmitting}>
        Guardar contraseña
      </Button>
    </form>
  );
}
