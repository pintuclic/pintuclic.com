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

/** Textos que cambian entre recuperar la contraseña y activar una cuenta de colaborador. */
const TEXTOS = {
  recuperacion: {
    enlaceInvalido: 'El enlace no es válido o está incompleto. Solicita uno nuevo para restablecer tu contraseña.',
    exito:
      'Tu contraseña fue actualizada. Por seguridad cerramos tus sesiones abiertas: inicia sesión con tu contraseña nueva.',
  },
  activacion: {
    enlaceInvalido: 'El enlace de activación no es válido o venció. Pide al administrador que te envíe uno nuevo.',
    exito: 'Tu cuenta quedó activada. Inicia sesión con la contraseña que acabas de definir.',
  },
} as const;

/**
 * HU-CUE-05 · Restablecer contraseña desde el enlace del correo.
 * HU-ADM-01 · Con `variante="activacion"`, el colaborador nuevo define su primera
 * contraseña con el enlace que le envió M17.
 * RN-CUE-09: no inicia sesión automáticamente; el backend invalida las sesiones
 * abiertas y el usuario entra de nuevo con su contraseña nueva.
 */
export function RestablecerForm({
  token,
  variante = 'recuperacion',
}: {
  token: string | null;
  variante?: keyof typeof TEXTOS;
}) {
  const textos = TEXTOS[variante];
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
        <Alert variant="error">{textos.enlaceInvalido}</Alert>
        {variante === 'recuperacion' && (
          <ButtonLink href="/recuperar-contrasena" fullWidth>
            Solicitar un enlace nuevo
          </ButtonLink>
        )}
      </div>
    );
  }

  if (listo) {
    return (
      <div className="flex flex-col gap-4">
        <Alert variant="success">{textos.exito}</Alert>
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
          {variante === 'recuperacion' ? (
            <Link href="/recuperar-contrasena" className="font-medium underline">
              Solicitar un enlace nuevo
            </Link>
          ) : (
            'Pide al administrador que te envíe uno nuevo.'
          )}
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
