'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, ButtonLink, Select, Textarea } from '@/core/components';
import { useAuthStore } from '@/core/store/authStore';
import { TIPOS_SOLICITUD, contactoFormSchema, type ContactoFormData } from '../../dtos/m15-atencion.dto';
import { enviarSolicitudContacto } from '../../services/atencion-api';
import { esSesionRequerida, mensajeDeError } from '../../services/mensaje-error';

const OPCIONES_TIPO = TIPOS_SOLICITUD.map(({ valor, etiqueta }) => ({ value: valor, label: etiqueta }));

export function FormularioContacto() {
  const usuario = useAuthStore((s) => s.usuario);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [confirmacion, setConfirmacion] = useState<{ aviso: string | null } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactoFormData>({
    resolver: zodResolver(contactoFormSchema),
    defaultValues: { tipo: 'consulta', descripcion: '' },
  });

  // CA-ATC-02-04: sin sesión no se muestra el formulario, se lleva a iniciar sesión.
  if (usuario === null) {
    return (
      <div className="space-y-4 rounded-card border border-neutral-light bg-neutral-lightest p-5">
        <p className="font-sans text-sm text-neutral-dark">
          Para escribirnos necesitas iniciar sesión. Así tomamos tus datos de contacto de tu cuenta y no
          tienes que escribirlos.
        </p>
        <ButtonLink href="/login" variant="primary-action">
          Iniciar sesión
        </ButtonLink>
      </div>
    );
  }

  const enviar = handleSubmit(async (datos) => {
    setError(null);
    setConfirmacion(null);

    try {
      const respuesta = await enviarSolicitudContacto(datos);
      setConfirmacion({ aviso: respuesta.avisoHorario });
      reset({ tipo: datos.tipo, descripcion: '' });

      // El camino formal de una cotización es el carrito; el formulario solo deja la intención.
      if (respuesta.remitirAlCarrito) {
        router.push('/carrito');
      }
    } catch (err: unknown) {
      if (esSesionRequerida(err)) {
        setError('Tu sesión ya no está activa. Inicia sesión de nuevo para enviar tu solicitud.');
        return;
      }
      setError(mensajeDeError(err, 'No pudimos enviar tu solicitud. Intenta de nuevo.'));
    }
  });

  return (
    <form onSubmit={enviar} className="space-y-4" noValidate>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-sans text-sm text-neutral-medium">
          Escribimos a <strong className="text-neutral-dark">{usuario.correo}</strong>, el correo de tu
          cuenta.
        </p>
        <ButtonLink href="/perfil?seccion=solicitudes" variant="ghost" size="sm">
          Ver mis solicitudes
        </ButtonLink>
      </div>

      <Select
        label="Tipo de solicitud"
        options={OPCIONES_TIPO}
        error={errors.tipo?.message}
        {...register('tipo')}
      />

      <Textarea
        label="Cuéntanos tu solicitud"
        rows={5}
        placeholder="Describe lo que necesitas"
        error={errors.descripcion?.message}
        {...register('descripcion')}
      />

      {confirmacion !== null && (
        <div className="space-y-2">
          <Alert variant={confirmacion.aviso === null ? 'success' : 'warning'}>
            {confirmacion.aviso ?? 'Recibimos tu solicitud. Te responderemos muy pronto.'}
          </Alert>
          <div>
            <ButtonLink href="/perfil?seccion=solicitudes" variant="outline" size="sm">
              Ver el seguimiento en Mis solicitudes
            </ButtonLink>
          </div>
        </div>
      )}

      {error !== null && <Alert variant="error">{error}</Alert>}

      <Button type="submit" variant="primary-conversion" isLoading={isSubmitting}>
        Enviar solicitud
      </Button>
    </form>
  );
}