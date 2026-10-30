'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LocateFixed } from 'lucide-react';
import { Alert, Button, Input, TextButton } from '@/core/components';
import { direccionClienteFormSchema, type DireccionClienteFormData } from '../../dtos/m04-cuentas.dto';
import type { Direccion } from '../../interfaces/api.interfaces';
import { direccionDesdeCoordenadas, motivoFalloUbicacion, type FalloUbicacion } from '../../services/geocodificacion';

export interface DireccionFormProps {
  /** Dirección a editar; sin ella el formulario crea una nueva. */
  inicial?: Direccion;
  onGuardar: (datos: DireccionClienteFormData) => Promise<void>;
  onCancelar: () => void;
}

type EstadoUbicacion = 'inactiva' | 'buscando' | 'capturada' | 'denegada';
/** Qué tanto se pudo completar la dirección con la ubicación del dispositivo. */
type Autocompletado = 'completo' | 'sin-barrio' | 'sin-calle' | 'ninguno';

const AVISO_UBICACION: Record<Autocompletado, { variante: 'success' | 'info' | 'warning'; texto: string }> = {
  completo: {
    variante: 'success',
    texto: 'Completamos la dirección y el barrio con tu ubicación. Revísalos y corrígelos si hace falta antes de guardar.',
  },
  'sin-barrio': {
    variante: 'info',
    texto: 'Completamos la dirección con tu ubicación, pero no encontramos el barrio. Escríbelo antes de guardar.',
  },
  'sin-calle': {
    variante: 'info',
    texto: 'Completamos el barrio con tu ubicación, pero no encontramos la calle. Escribe la dirección antes de guardar.',
  },
  ninguno: {
    variante: 'warning',
    texto: 'Guardamos tu ubicación, pero no pudimos convertirla en una dirección. Escríbela manualmente.',
  },
};

const AVISO_FALLO_UBICACION: Record<FalloUbicacion, string> = {
  'conexion-insegura': 'Tu navegador solo permite usar la ubicación en conexiones seguras (https). Escribe la dirección manualmente.',
  permiso:
    'El navegador no nos dejó usar tu ubicación. Actívala en los permisos del sitio o escribe la dirección manualmente.',
  'no-disponible':
    'Tu dispositivo no pudo determinar dónde estás. Revisa que la ubicación esté activada o escribe la dirección manualmente.',
  tiempo: 'Tardamos demasiado en obtener tu ubicación. Inténtalo de nuevo o escribe la dirección manualmente.',
};

/**
 * HU-CUE-07 · Alta y edición de la dirección de entrega. La ubicación del dispositivo es
 * opcional (CA-CUE-07-04): con ella se completan la dirección y el barrio para que el
 * cliente los revise y los edite; negarla no bloquea el registro manual (RN-CUE-22).
 */
export function DireccionForm({ inicial, onGuardar, onCancelar }: DireccionFormProps) {
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [ubicacion, setUbicacion] = useState<EstadoUbicacion>(
    inicial?.latitud != null && inicial?.longitud != null ? 'capturada' : 'inactiva',
  );
  const [autocompletado, setAutocompletado] = useState<Autocompletado | null>(null);
  const [falloUbicacion, setFalloUbicacion] = useState<FalloUbicacion>('no-disponible');
  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<DireccionClienteFormData>({
    resolver: zodResolver(direccionClienteFormSchema),
    defaultValues: {
      direccion: inicial?.direccion ?? '',
      barrio: inicial?.barrio ?? '',
      apartamentoCasa: inicial?.apartamentoCasa ?? '',
      municipio: inicial?.municipio ?? '',
      departamento: inicial?.departamento ?? '',
      nombreApellido: inicial?.nombreApellido ?? '',
      telefono: inicial?.telefono ?? '',
      // La única dirección de la cuenta siempre es la predeterminada.
      esPredeterminada: true,
      latitud: inicial?.latitud ?? undefined,
      longitud: inicial?.longitud ?? undefined,
    },
  });

  // La consulta puede tardar: si el formulario se cierra mientras tanto, no se toca nada.
  const montado = useRef(true);
  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const completarConUbicacion = async (latitud: number, longitud: number) => {
    setValue('latitud', latitud);
    setValue('longitud', longitud);
    const direccionAntes = getValues('direccion');
    const barrioAntes = getValues('barrio');
    const sugerida = await direccionDesdeCoordenadas(latitud, longitud);
    if (!montado.current) return;
    const opciones = { shouldValidate: true, shouldDirty: true } as const;
    // Lo que la persona corrigió mientras esperaba no se pisa con la sugerencia.
    if (sugerida?.direccion && getValues('direccion') === direccionAntes) setValue('direccion', sugerida.direccion, opciones);
    if (sugerida?.barrio && getValues('barrio') === barrioAntes) setValue('barrio', sugerida.barrio, opciones);
    if (sugerida?.direccion && sugerida.barrio) setAutocompletado('completo');
    else if (sugerida?.direccion) setAutocompletado('sin-barrio');
    else if (sugerida?.barrio) setAutocompletado('sin-calle');
    else setAutocompletado('ninguno');
    setUbicacion('capturada');
  };

  const usarUbicacion = () => {
    const contextoSeguro = typeof window === 'undefined' || window.isSecureContext;
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setFalloUbicacion(motivoFalloUbicacion(null, contextoSeguro));
      setUbicacion('denegada');
      return;
    }
    setUbicacion('buscando');
    setAutocompletado(null);
    // Precisión normal (Wi-Fi o red): basta para la dirección y responde rápido; el GPS de alta
    // precisión en un equipo de escritorio suele agotar el tiempo sin dar nada.
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        void completarConUbicacion(Number(coords.latitude.toFixed(6)), Number(coords.longitude.toFixed(6)));
      },
      (error) => {
        setFalloUbicacion(motivoFalloUbicacion(error.code, contextoSeguro));
        setUbicacion('denegada');
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 },
    );
  };

  const quitarUbicacion = () => {
    setValue('latitud', undefined);
    setValue('longitud', undefined);
    setAutocompletado(null);
    setUbicacion('inactiva');
  };

  const aviso = autocompletado ? AVISO_UBICACION[autocompletado] : null;

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
        {ubicacion === 'capturada' && (
          <Alert variant={aviso?.variante ?? 'info'}>
            {aviso?.texto ?? 'Esta dirección tiene tu ubicación guardada.'}{' '}
            <TextButton onClick={quitarUbicacion} className="underline">
              Quitar ubicación
            </TextButton>
          </Alert>
        )}
        {ubicacion === 'denegada' && <Alert variant="warning">{AVISO_FALLO_UBICACION[falloUbicacion]}</Alert>}
      </div>

      <Input id="dir-direccion" label="Dirección" autoComplete="street-address" placeholder="Ej. Calle 10 # 20-30" error={errors.direccion?.message} {...register('direccion')} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input id="dir-barrio" label="Barrio" placeholder="Ej. El Poblado" error={errors.barrio?.message} {...register('barrio')} />
        <Input id="dir-apto" label="Apartamento o casa (opcional)" placeholder="Ej. Apto 301, Torre 2" error={errors.apartamentoCasa?.message} {...register('apartamentoCasa')} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input id="dir-municipio" label="Municipio (opcional)" autoComplete="address-level2" placeholder="Ej. Medellín" error={errors.municipio?.message} {...register('municipio')} />
        <Input id="dir-departamento" label="Departamento (opcional)" autoComplete="address-level1" placeholder="Ej. Antioquia" error={errors.departamento?.message} {...register('departamento')} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input id="dir-nombre" label="Nombre y apellido de quien recibe" autoComplete="name" error={errors.nombreApellido?.message} {...register('nombreApellido')} />
        <Input id="dir-telefono" label="Teléfono de contacto" type="tel" autoComplete="tel" placeholder="300 000 0000" error={errors.telefono?.message} {...register('telefono')} />
      </div>
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
