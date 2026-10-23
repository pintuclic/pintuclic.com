'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Badge, Button, Input } from '@/core/components';
import {
  actualizarDatosPerfilFormSchema,
  type ActualizarDatosPerfilFormData,
} from '../../dtos/m04-cuentas.dto';
import type { PerfilUsuario } from '../../interfaces/api.interfaces';
import { actualizarPerfil } from '../../services/cuentas.service';
import { aErrorCuentas } from '../../services/errores';
import { SeccionPerfil } from './SeccionPerfil';

/** Dato que no se edita aquí: se muestra como texto, no como campo, para no invitar a escribir. */
function SoloLectura({ etiqueta, valor, ayuda }: { etiqueta: string; valor: string; ayuda: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-sans text-sm font-medium text-neutral-dark">{etiqueta}</span>
      <p className="rounded-input border border-neutral-light/70 bg-neutral-lightest px-3 py-2.5 font-sans text-sm text-neutral-dark">
        {valor}
      </p>
      <p className="font-sans text-xs text-neutral-medium">{ayuda}</p>
    </div>
  );
}

export interface DatosSectionProps {
  perfil: PerfilUsuario;
  onActualizado: (perfil: PerfilUsuario) => void;
}

/**
 * HU-CUE-06 (06-A) · Nombre y teléfono editables. Correo y NIT se muestran de solo
 * lectura: el correo cambia con verificación (Seguridad) y el NIT solo mediante
 * renovación con RUT (CA-CUE-06-05).
 */
export function DatosSection({ perfil, onActualizado }: DatosSectionProps) {
  const [exito, setExito] = useState(false);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ActualizarDatosPerfilFormData>({
    resolver: zodResolver(actualizarDatosPerfilFormSchema),
    defaultValues: { nombre: perfil.nombre, telefono: perfil.telefono ?? '' },
  });

  const enviar = handleSubmit(async (datos) => {
    setExito(false);
    setErrorServidor(null);
    try {
      const actualizado = await actualizarPerfil(datos);
      reset({ nombre: actualizado.nombre, telefono: actualizado.telefono ?? '' });
      onActualizado(actualizado);
      setExito(true);
    } catch (error) {
      setErrorServidor(aErrorCuentas(error).mensaje);
    }
  });

  return (
    <SeccionPerfil
      titulo="Mis datos"
      descripcion="Así te identificamos en tus pedidos y comunicaciones."
      accion={
        <Badge variant={perfil.tipo === 'empresa' ? 'action' : 'neutral'}>
          {perfil.tipo === 'empresa' ? 'Cuenta empresa' : 'Cuenta personal'}
        </Badge>
      }
    >
      <form onSubmit={enviar} noValidate className="grid gap-4 sm:grid-cols-2">
        {exito && (
          <div className="sm:col-span-2">
            <Alert variant="success">Tus datos se guardaron correctamente.</Alert>
          </div>
        )}
        {errorServidor && (
          <div className="sm:col-span-2">
            <Alert variant="error">{errorServidor}</Alert>
          </div>
        )}
        <Input id="perfil-nombre" label="Nombre completo" autoComplete="name" error={errors.nombre?.message} {...register('nombre')} />
        <Input id="perfil-telefono" label="Teléfono (WhatsApp)" type="tel" autoComplete="tel" error={errors.telefono?.message} {...register('telefono')} />
        <SoloLectura
          etiqueta="Correo electrónico"
          valor={perfil.correo}
          ayuda="Para cambiarlo, ve a Seguridad: verificaremos el correo nuevo."
        />
        {perfil.empresa && (
          <SoloLectura
            etiqueta="NIT"
            valor={perfil.empresa.nit}
            ayuda="El NIT solo cambia con una solicitud de renovación del RUT."
          />
        )}
        <div className="sm:col-span-2">
          <Button type="submit" isLoading={isSubmitting} disabled={!isDirty}>
            Guardar cambios
          </Button>
        </div>
      </form>
    </SeccionPerfil>
  );
}
