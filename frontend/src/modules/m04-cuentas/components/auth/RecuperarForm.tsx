'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Input } from '@/core/components';
import {
  solicitarRecuperacionPasswordFormSchema,
  type SolicitarRecuperacionPasswordFormData,
} from '../../dtos/m04-cuentas.dto';
import { solicitarRecuperacion } from '../../services/cuentas.service';
import { aErrorCuentas } from '../../services/errores';

/**
 * Mensaje uniforme (RN-CUE-08): no revela si el correo existe, para no permitir
 * enumerar cuentas.
 */
const MENSAJE_UNIFORME =
  'Si el correo está registrado, te enviaremos un enlace para crear una nueva contraseña. Revisa también tu carpeta de spam.';

/** HU-CUE-05 · Solicitud de recuperación de contraseña. */
export function RecuperarForm({ onVolver }: { onVolver: () => void }) {
  const [enviado, setEnviado] = useState(false);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SolicitarRecuperacionPasswordFormData>({
    resolver: zodResolver(solicitarRecuperacionPasswordFormSchema),
    defaultValues: { correo: '' },
  });

  const enviar = handleSubmit(async ({ correo }) => {
    setErrorServidor(null);
    try {
      await solicitarRecuperacion(correo);
      setEnviado(true);
    } catch (error) {
      setErrorServidor(aErrorCuentas(error).mensaje);
    }
  });

  if (enviado) {
    return (
      <div className="flex flex-col gap-4">
        <Alert variant="success">{MENSAJE_UNIFORME}</Alert>
        <Button type="button" variant="ghost" fullWidth onClick={onVolver}>
          ← Volver a iniciar sesión
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
      {errorServidor && <Alert variant="error">{errorServidor}</Alert>}
      <Input
        id="recuperar-correo"
        label="Correo electrónico"
        type="email"
        autoComplete="email"
        placeholder="correo@ejemplo.com"
        error={errors.correo?.message}
        {...register('correo')}
      />
      <Button type="submit" fullWidth isLoading={isSubmitting}>
        Enviar enlace
      </Button>
      <Button type="button" variant="ghost" fullWidth onClick={onVolver}>
        ← Volver a iniciar sesión
      </Button>
    </form>
  );
}
