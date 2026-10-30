'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Input, PasswordInput, TextButton } from '@/core/components';
import { useAuthStore } from '@/core/store/authStore';
import { loginFormSchema, type LoginFormData } from '../../dtos/m04-cuentas.dto';
import type { ResultadoOAuthGoogle, UsuarioResumen } from '../../interfaces/api.interfaces';
import { iniciarSesion } from '../../services/cuentas.service';
import { aErrorCuentas } from '../../services/errores';
import { BotonGoogle } from './BotonGoogle';

export interface LoginFormProps {
  onAutenticado: (usuario: UsuarioResumen) => void;
  onCambioObligatorio: (tokenCambio: string) => void;
  onIrARegistro: () => void;
  onIrARecuperar: () => void;
  onResultadoGoogle?: (resultado: ResultadoOAuthGoogle) => void;
}

/** HU-CUE-04 · Inicio de sesión. Derivado del modal de registro (UI Spec §4.2, nota). */
export function LoginForm({
  onAutenticado,
  onCambioObligatorio,
  onIrARegistro,
  onIrARecuperar,
  onResultadoGoogle,
}: LoginFormProps) {
  const establecerUsuario = useAuthStore((s) => s.establecerUsuario);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginFormSchema), defaultValues: { correo: '', contrasena: '' } });

  const enviar = handleSubmit(async (datos) => {
    setErrorServidor(null);
    try {
      const resultado = await iniciarSesion(datos);
      if (resultado.tipo === 'cambio_obligatorio') {
        onCambioObligatorio(resultado.tokenCambio);
        return;
      }
      establecerUsuario(resultado.usuario);
      onAutenticado(resultado.usuario);
    } catch (error) {
      setErrorServidor(aErrorCuentas(error).mensaje);
    }
  });

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
      {errorServidor && <Alert variant="error">{errorServidor}</Alert>}
      <Input
        id="login-correo"
        label="Correo electrónico"
        type="email"
        autoComplete="email"
        placeholder="correo@ejemplo.com"
        error={errors.correo?.message}
        {...register('correo')}
      />
      <PasswordInput
        id="login-contrasena"
        label="Contraseña"
        autoComplete="current-password"
        error={errors.contrasena?.message}
        {...register('contrasena')}
      />
      <TextButton onClick={onIrARecuperar} className="self-end text-sm">
        ¿Olvidaste tu contraseña?
      </TextButton>
      <Button type="submit" fullWidth isLoading={isSubmitting}>
        Iniciar sesión
      </Button>
      <BotonGoogle onResultado={onResultadoGoogle} />
      <p className="text-center font-sans text-sm text-neutral-dark">
        ¿No tienes cuenta?{' '}
        <TextButton onClick={onIrARegistro}>Crear cuenta</TextButton>
      </p>
    </form>
  );
}
