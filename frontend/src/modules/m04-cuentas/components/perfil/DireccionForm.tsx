'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LocateFixed } from 'lucide-react';
import { Alert, Button, Checkbox, Input, TextButton } from '@/core/components';
import { direccionClienteFormSchema, type DireccionClienteFormData } from '../../dtos/m04-cuentas.dto';
import type { Direccion } from '../../interfaces/api.interfaces';

export interface DireccionFormProps {
  /** Dirección a editar; sin ella el formulario crea una nueva. */
  inicial?: Direccion;
  /** La primera dirección siempre queda predeterminada (DP-06). */
  esPrimera: boolean;
  onGuardar: (datos: DireccionClienteFormData) => Promise<void>;
  onCancelar: () => void;
}

type EstadoUbicacion = 'inactiva' | 'buscando' | 'capturada' | 'denegada';

/**
 * HU-CUE-07 · Alta y edición de direcciones. La ubicación del dispositivo es
 * opcional (CA-CUE-07-04): solo se guardan coordenadas si el usuario la pide y
 * guarda la dirección; negarla no bloquea el registro manual (RN-CUE-22).
 */
export function DireccionForm({ inicial, esPrimera, onGuardar, onCancelar }: DireccionFormProps) {
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [ubicacion, setUbicacion] = useState<EstadoUbicacion>(
    inicial?.latitud != null && inicial?.longitud != null ? 'capturada' : 'inactiva',
  );
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DireccionClienteFormData>({
    resolver: zodResolver(direccionClienteFormSchema),
    defaultValues: {
      direccion: inicial?.direccion ?? '',
      barrio: inicial?.barrio ?? '',
      apartamentoCasa: inicial?.apartamentoCasa ?? '',
      nombreApellido: inicial?.nombreApellido ?? '',
      telefono: inicial?.telefono ?? '',
      esPredeterminada: inicial?.esPredeterminada ?? esPrimera,
      latitud: inicial?.latitud ?? undefined,
      longitud: inicial?.longitud ?? undefined,
    },
  });

  const latitud = watch('latitud');
  const longitud = watch('longitud');

  const usarUbicacion = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setUbicacion('denegada');
      return;
    }
    setUbicacion('buscando');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setValue('latitud', Number(coords.latitude.toFixed(6)));
        setValue('longitud', Number(coords.longitude.toFixed(6)));
        setUbicacion('capturada');
      },
      () => setUbicacion('denegada'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  const quitarUbicacion = () => {
    setValue('latitud', undefined);
    setValue('longitud', undefined);
    setUbicacion('inactiva');
  };

  const enviar = handleSubmit(async (datos) => {
    setErrorServidor(null);
    try {
      await onGuardar(datos);
    } catch (error) {
      setErrorServidor(error instanceof Error ? error.message : 'No pudimos guardar la dirección.');
    }
  });

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
      {errorServidor && <Alert variant="error">{errorServidor}</Alert>}

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          isLoading={ubicacion === 'buscando'}
          leftIcon={<LocateFixed className="h-4 w-4" aria-hidden="true" />}
          onClick={usarUbicacion}
          className="self-start"
        >
          Usar mi ubicación actual
        </Button>
        {ubicacion === 'capturada' && latitud !== undefined && longitud !== undefined && (
          <Alert variant="info">
            Ubicación agregada ({latitud.toFixed(5)}, {longitud.toFixed(5)}). Revisa y completa la dirección antes de
            guardar.{' '}
            <TextButton onClick={quitarUbicacion} className="underline">
              Quitar ubicación
            </TextButton>
          </Alert>
        )}
        {ubicacion === 'denegada' && (
          <Alert variant="warning">
            No pudimos obtener tu ubicación. Puedes escribir la dirección manualmente.
          </Alert>
        )}
      </div>

      <Input id="dir-direccion" label="Dirección" autoComplete="street-address" placeholder="Ej. Calle 10 # 20-30" error={errors.direccion?.message} {...register('direccion')} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input id="dir-barrio" label="Barrio" placeholder="Ej. El Poblado" error={errors.barrio?.message} {...register('barrio')} />
        <Input id="dir-apto" label="Apartamento o casa (opcional)" placeholder="Ej. Apto 301, Torre 2" error={errors.apartamentoCasa?.message} {...register('apartamentoCasa')} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input id="dir-nombre" label="Nombre y apellido de quien recibe" autoComplete="name" error={errors.nombreApellido?.message} {...register('nombreApellido')} />
        <Input id="dir-telefono" label="Teléfono de contacto" type="tel" autoComplete="tel" placeholder="300 000 0000" error={errors.telefono?.message} {...register('telefono')} />
      </div>
      {esPrimera || inicial?.esPredeterminada ? (
        // Un campo `disabled` llegaría vacío al formulario: aquí basta con informar.
        <p className="font-sans text-sm text-neutral-medium">
          {esPrimera
            ? 'Será tu dirección predeterminada porque es la primera que guardas.'
            : 'Esta es tu dirección predeterminada.'}
        </p>
      ) : (
        <Checkbox
          id="dir-predeterminada"
          label="Usar como dirección predeterminada"
          checked={watch('esPredeterminada')}
          {...register('esPredeterminada')}
        />
      )}

      <div className="flex flex-wrap justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {inicial ? 'Guardar cambios' : 'Guardar dirección'}
        </Button>
      </div>
    </form>
  );
}
