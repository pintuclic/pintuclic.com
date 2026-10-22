'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, PasswordInput } from '@/core/components';
import { useAuthStore } from '@/core/store/authStore';
import {
  cambioContrasenaPrimerAccesoFormSchema,
  type CambioContrasenaPrimerAccesoFormData,
} from '../../dtos/m04-cuentas.dto';
import type { UsuarioResumen } from '../../interfaces/api.interfaces';
import { cambiarContrasenaPrimerAcceso } from '../../services/cuentas.service';
import { aErrorCuentas } from '../../services/errores';

export interface PrimerAccesoFormProps {
  tokenCambio: string;
  onCompletado: (usuario: UsuarioResumen) => void;
  onVolver: () => void;
}

/**
 * HU-CUE-04 · Cambio obligatorio de la contraseña temporal en el primer acceso
 * (cuentas creadas por un administrador). La sesión se abre al completarlo.
 */
export function PrimerAccesoForm({ tokenCambio, onCompletado, onVolver }: PrimerAccesoFormProps) {
  const establecerUsuario = useAuthStore((s) => s.establecerUsuario);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CambioContrasenaPrimerAccesoFormData>({
    resolver: zodResolver(cambioContrasenaPrimerAccesoFormSchema),
    defaultValues: { contrasenaActual: '', nuevaContrasena: '', confirmarNuevaContrasena: '' },
  });

  const enviar = handleSubmit(async ({ contrasenaActual, nuevaContrasena }) => {
    setErrorServidor(null);
    try {
      const usuario = await cambiarContrasenaPrimerAcceso(tokenCambio, contrasenaActual, nuevaContrasena);
      establecerUsuario(usuario);
      onCompletado(usuario);
    } catch (error) {
      setErrorServidor(aErrorCuentas(error).mensaje);
    }
  });

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
      {errorServidor && <Alert variant="error">{errorServidor}</Alert>}
      <PasswordInput
        id="primer-acceso-actual"
        label="Contraseña temporal"
        autoComplete="current-password"
        error={errors.contrasenaActual?.message}
        {...register('contrasenaActual')}
      />
      <PasswordInput
        id="primer-acceso-nueva"
        label="Nueva contraseña"
        autoComplete="new-password"
        placeholder="Mínimo 12 caracteres"
        helperText="Entre 12 y 128 caracteres."
        error={errors.nuevaContrasena?.message}
        {...register('nuevaContrasena')}
      />
      <PasswordInput
        id="primer-acceso-confirmar"
        label="Confirmar nueva contraseña"
        autoComplete="new-password"
        error={errors.confirmarNuevaContrasena?.message}
        {...register('confirmarNuevaContrasena')}
      />
      <Button type="submit" fullWidth isLoading={isSubmitting}>
        Cambiar contraseña y entrar
      </Button>
      <Button type="button" variant="ghost" fullWidth onClick={onVolver}>
        ← Volver
      </Button>
    </form>
  );
}
