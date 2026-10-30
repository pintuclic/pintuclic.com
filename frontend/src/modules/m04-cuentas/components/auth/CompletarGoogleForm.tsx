'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Checkbox, Input, PasswordInput } from '@/core/components';
import { useAuthStore } from '@/core/store/authStore';
import {
  completarRegistroGoogleFormSchema,
  type CompletarRegistroGoogleFormData,
} from '../../dtos/m04-cuentas.dto';
import type { DatosRegistroGooglePendiente, UsuarioResumen } from '../../interfaces/api.interfaces';
import { completarRegistroGoogle } from '../../services/cuentas.service';
import { aErrorCuentas } from '../../services/errores';

export interface CompletarGoogleFormProps {
  datosGoogle: DatosRegistroGooglePendiente;
  onCompletado: (usuario: UsuarioResumen) => void;
  onVolver: () => void;
}

const TERMINOS = (
  <>
    Acepto los <span className="font-medium text-action">Términos y Condiciones</span> y la Política de Tratamiento
    de Datos.
  </>
);

/**
 * Completa el alta con Google recogiendo teléfono, contraseña propia y aceptación de términos.
 */
export function CompletarGoogleForm({ datosGoogle, onCompletado, onVolver }: CompletarGoogleFormProps) {
  const establecerUsuario = useAuthStore((s) => s.establecerUsuario);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CompletarRegistroGoogleFormData>({
    resolver: zodResolver(completarRegistroGoogleFormSchema),
    defaultValues: {
      telefono: '',
      contrasena: '',
      confirmarContrasena: '',
      aceptaTerminos: false,
    },
  });

  const enviar = handleSubmit(async (datos) => {
    setErrorServidor(null);
    try {
      const usuario = await completarRegistroGoogle(
        datosGoogle.tokenRegistroTemporal,
        datos.telefono,
        datos.contrasena,
      );
      establecerUsuario(usuario);
      onCompletado(usuario);
    } catch (error) {
      setErrorServidor(aErrorCuentas(error).mensaje);
    }
  });

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
      {errorServidor && <Alert variant="error">{errorServidor}</Alert>}

      <div className="rounded-lg border border-neutral-light bg-neutral-lighter/60 px-4 py-3">
        <p className="font-sans text-xs text-neutral-medium">Cuenta de Google verificada</p>
        <p className="mt-0.5 font-sans text-sm font-semibold text-neutral-black">{datosGoogle.nombre}</p>
        <p className="font-sans text-xs text-neutral-dark">{datosGoogle.email}</p>
      </div>

      <Input
        id="google-reg-telefono"
        label="Teléfono (WhatsApp)"
        type="tel"
        autoComplete="tel"
        placeholder="300 000 0000"
        error={errors.telefono?.message}
        {...register('telefono')}
      />
      <PasswordInput
        id="google-reg-contrasena"
        label="Crea una contraseña"
        autoComplete="new-password"
        placeholder="Mínimo 12 caracteres"
        helperText="Entre 12 y 128 caracteres. También podrás entrar con correo y contraseña."
        error={errors.contrasena?.message}
        {...register('contrasena')}
      />
      <PasswordInput
        id="google-reg-confirmar"
        label="Confirmar contraseña"
        autoComplete="new-password"
        placeholder="Repite tu contraseña"
        error={errors.confirmarContrasena?.message}
        {...register('confirmarContrasena')}
      />
      <Checkbox
        id="google-reg-terminos"
        label={TERMINOS}
        checked={watch('aceptaTerminos')}
        error={errors.aceptaTerminos?.message}
        {...register('aceptaTerminos')}
      />
      <Button type="submit" fullWidth isLoading={isSubmitting}>
        Crear cuenta y entrar
      </Button>
      <Button type="button" variant="ghost" fullWidth onClick={onVolver}>
        ← Volver
      </Button>
    </form>
  );
}

