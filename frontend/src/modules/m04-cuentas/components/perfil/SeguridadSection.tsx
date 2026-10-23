'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Input, OtpInput, PasswordInput } from '@/core/components';
import {
  cambiarContrasenaPerfilFormSchema,
  codigoOtpSchema,
  solicitarCambioCorreoFormSchema,
  type CambiarContrasenaPerfilFormData,
  type SolicitarCambioCorreoFormData,
} from '../../dtos/m04-cuentas.dto';
import type { CambioCorreoIniciado, PerfilUsuario } from '../../interfaces/api.interfaces';
import { cambiarContrasena, confirmarCambioCorreo, solicitarCambioCorreo } from '../../services/cuentas.service';
import { aErrorCuentas } from '../../services/errores';
import { minutosDesde } from '../auth/utilidades';
import { SeccionPerfil } from './SeccionPerfil';

export interface SeguridadSectionProps {
  perfil: PerfilUsuario;
  onCorreoCambiado: (nuevoCorreo: string) => void;
  /** El cambio de contraseña cierra TODAS las sesiones, incluida esta (DP-16). */
  onSesionInvalidada: (mensaje: string) => void;
}

export function SeguridadSection({ perfil, onCorreoCambiado, onSesionInvalidada }: SeguridadSectionProps) {
  return (
    <div className="flex flex-col gap-6">
      <CambioContrasena onSesionInvalidada={onSesionInvalidada} />
      <CambioCorreo correoActual={perfil.correo} onCorreoCambiado={onCorreoCambiado} />
    </div>
  );
}

/** HU-CUE-06 (06-A) · Cambio de contraseña con la actual (CA-CUE-06-03/04). */
function CambioContrasena({ onSesionInvalidada }: { onSesionInvalidada: (mensaje: string) => void }) {
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CambiarContrasenaPerfilFormData>({
    resolver: zodResolver(cambiarContrasenaPerfilFormSchema),
    defaultValues: { contrasenaActual: '', nuevaContrasena: '', confirmarNuevaContrasena: '' },
  });

  const enviar = handleSubmit(async ({ contrasenaActual, nuevaContrasena }) => {
    setErrorServidor(null);
    try {
      await cambiarContrasena(contrasenaActual, nuevaContrasena);
      onSesionInvalidada(
        'Tu contraseña se actualizó. Por seguridad cerramos todas tus sesiones, incluida esta: inicia sesión con tu contraseña nueva.',
      );
    } catch (error) {
      setErrorServidor(aErrorCuentas(error).mensaje);
    }
  });

  return (
    <SeccionPerfil
      titulo="Contraseña"
      descripcion="Al cambiarla cerraremos tu sesión en todos los dispositivos."
    >
      <form onSubmit={enviar} noValidate className="grid gap-4 sm:grid-cols-2">
        {errorServidor && (
          <div className="sm:col-span-2">
            <Alert variant="error">{errorServidor}</Alert>
          </div>
        )}
        <div className="sm:col-span-2 sm:max-w-[calc(50%-0.5rem)]">
          <PasswordInput
            id="seg-actual"
            label="Contraseña actual"
            autoComplete="current-password"
            error={errors.contrasenaActual?.message}
            {...register('contrasenaActual')}
          />
        </div>
        <PasswordInput
          id="seg-nueva"
          label="Nueva contraseña"
          autoComplete="new-password"
          placeholder="Mínimo 12 caracteres"
          helperText="Entre 12 y 128 caracteres."
          error={errors.nuevaContrasena?.message}
          {...register('nuevaContrasena')}
        />
        <PasswordInput
          id="seg-confirmar"
          label="Confirmar nueva contraseña"
          autoComplete="new-password"
          error={errors.confirmarNuevaContrasena?.message}
          {...register('confirmarNuevaContrasena')}
        />
        <div className="sm:col-span-2">
          <Button type="submit" isLoading={isSubmitting}>
            Cambiar contraseña
          </Button>
        </div>
      </form>
    </SeccionPerfil>
  );
}

/**
 * HU-CUE-06 (06-B) · Cambio de correo en dos pasos. El correo vigente no cambia
 * hasta confirmar el código enviado al nuevo (RN-CUE-11).
 */
function CambioCorreo({
  correoActual,
  onCorreoCambiado,
}: {
  correoActual: string;
  onCorreoCambiado: (nuevoCorreo: string) => void;
}) {
  const [solicitud, setSolicitud] = useState<CambioCorreoIniciado | null>(null);
  const [codigo, setCodigo] = useState('');
  const [errorCodigo, setErrorCodigo] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [exito, setExito] = useState<string | null>(null);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SolicitarCambioCorreoFormData>({
    resolver: zodResolver(solicitarCambioCorreoFormSchema),
    defaultValues: { nuevoCorreo: '', contrasena: '' },
  });

  const solicitar = handleSubmit(async ({ nuevoCorreo, contrasena }) => {
    setErrorServidor(null);
    setExito(null);
    try {
      setSolicitud(await solicitarCambioCorreo(nuevoCorreo, contrasena));
      setCodigo('');
    } catch (error) {
      setErrorServidor(aErrorCuentas(error).mensaje);
    }
  });

  const confirmar = async () => {
    if (!solicitud) return;
    const validacion = codigoOtpSchema.safeParse(codigo);
    if (!validacion.success) {
      setErrorCodigo(validacion.error.issues[0]?.message ?? 'Código inválido');
      return;
    }
    setErrorCodigo(null);
    setConfirmando(true);
    try {
      const nuevo = await confirmarCambioCorreo(solicitud.nuevoCorreo, validacion.data);
      onCorreoCambiado(nuevo);
      setSolicitud(null);
      reset();
      // CA-CUE-06-02 pide avisar al correo anterior, pero el backend aún no emite ese
      // evento (pendiente con M18): no se promete aquí.
      setExito(`Listo: tu correo ahora es ${nuevo}.`);
    } catch (error) {
      setErrorCodigo(aErrorCuentas(error).mensaje);
    } finally {
      setConfirmando(false);
    }
  };

  return (
    <SeccionPerfil
      titulo="Correo electrónico"
      descripcion={
        <>
          Correo actual: <span className="font-medium text-neutral-black">{correoActual}</span>
        </>
      }
    >
      {exito && (
        <div className="mb-4">
          <Alert variant="success">{exito}</Alert>
        </div>
      )}

      {solicitud ? (
        <div className="flex max-w-md flex-col gap-4">
          <p className="font-sans text-sm text-neutral-dark">
            Escribe el código de 6 dígitos que enviamos a{' '}
            <span className="font-medium text-neutral-black">{solicitud.nuevoCorreo}</span>.
          </p>
          <OtpInput value={codigo} onChange={setCodigo} label="Código de verificación" error={errorCodigo ?? undefined} autoFocus />
          <Alert variant="timer">
            El código expira en {minutosDesde(solicitud.tiempoExpiracionSegundos)} minutos. Tu correo actual sigue
            vigente hasta que lo confirmes.
          </Alert>
          <div className="flex flex-wrap gap-3">
            <Button type="button" isLoading={confirmando} onClick={confirmar}>
              Confirmar correo
            </Button>
            <Button type="button" variant="ghost" onClick={() => setSolicitud(null)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={solicitar} noValidate className="grid gap-4 sm:grid-cols-2">
          {errorServidor && (
            <div className="sm:col-span-2">
              <Alert variant="error">{errorServidor}</Alert>
            </div>
          )}
          <Input
            id="correo-nuevo"
            label="Correo nuevo"
            type="email"
            autoComplete="email"
            placeholder="correo@ejemplo.com"
            error={errors.nuevoCorreo?.message}
            {...register('nuevoCorreo')}
          />
          <PasswordInput
            id="correo-contrasena"
            label="Tu contraseña"
            autoComplete="current-password"
            helperText="La pedimos para confirmar que eres tú."
            error={errors.contrasena?.message}
            {...register('contrasena')}
          />
          <div className="sm:col-span-2">
            <Button type="submit" variant="outline" isLoading={isSubmitting}>
              Enviar código al correo nuevo
            </Button>
          </div>
        </form>
      )}
    </SeccionPerfil>
  );
}
