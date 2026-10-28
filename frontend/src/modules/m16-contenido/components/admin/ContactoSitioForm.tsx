'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Input, Skeleton } from '@/core/components';
import { mensajeDeError } from '@/core/utils/errorApi';
import { editarContactoRequestSchema, type ContactoAdminEntity, type EditarContactoRequest } from '../../dtos/m16-contenido.dto';
import { guardarContactoAdmin, obtenerContactoAdmin } from '../../services/contenido-api';

type EntradaContacto = {
  direccion: string;
  telefono: string;
  correo: string;
  facebook: string;
  instagram: string;
  youtube: string;
  tiktok: string;
};

const aEntrada = (c: ContactoAdminEntity): EntradaContacto => ({
  direccion: c.direccion ?? '',
  telefono: c.telefono ?? '',
  correo: c.correo ?? '',
  facebook: c.facebook ?? '',
  instagram: c.instagram ?? '',
  youtube: c.youtube ?? '',
  tiktok: c.tiktok ?? '',
});

const VACIO: EntradaContacto = { direccion: '', telefono: '', correo: '', facebook: '', instagram: '', youtube: '', tiktok: '' };

/**
 * Datos de contacto del sitio (HU-CON-05): dirección, teléfono, correo y redes del pie de página. Todo es opcional y lo que
 * se deje vacío no se muestra en la tienda. Las redes deben ser enlaces `https://`.
 */
export const ContactoSitioForm: React.FC = () => {
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ultimo, setUltimo] = useState<ContactoAdminEntity | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<z.input<typeof editarContactoRequestSchema>, unknown, EditarContactoRequest>({
    resolver: zodResolver(editarContactoRequestSchema),
    defaultValues: VACIO,
  });

  const cargar = useCallback(async () => {
    setCargando(true);
    setErrorCarga(null);
    try {
      const c = await obtenerContactoAdmin();
      setUltimo(c);
      reset(aEntrada(c));
    } catch (err: unknown) {
      setErrorCarga(mensajeDeError(err));
    } finally {
      setCargando(false);
    }
  }, [reset]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const guardar = async (valores: EditarContactoRequest): Promise<void> => {
    setErrorGuardar(null);
    setAviso(null);
    try {
      const c = await guardarContactoAdmin(valores);
      setUltimo(c);
      reset(aEntrada(c));
      setAviso('Datos de contacto guardados: ya se ven en el pie de la tienda.');
    } catch (err: unknown) {
      setErrorGuardar(mensajeDeError(err));
    }
  };

  if (cargando) return <Skeleton className="h-72 w-full" />;
  if (errorCarga !== null) {
    return (
      <Alert variant="error">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>{errorCarga}</span>
          <Button variant="outline" size="sm" onClick={() => void cargar()}>
            Reintentar
          </Button>
        </div>
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit(guardar)} noValidate className="space-y-5" aria-label="Datos de contacto del sitio">
      <div>
        <h2 className="font-title text-lg font-semibold text-corporate">Contacto del sitio</h2>
        <p className="font-sans text-sm text-neutral-medium">
          Aparecen en el pie de la tienda. Lo que deje vacío no se muestra. Para el WhatsApp y el horario de atención use la sección de Atención al cliente.
        </p>
      </div>

      {errorGuardar !== null && <Alert variant="error">{errorGuardar}</Alert>}
      {aviso !== null && <Alert variant="success">{aviso}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Input id="contacto-direccion" label="Dirección" placeholder="Calle 10 # 5-20, Bogotá" error={errors.direccion?.message} {...register('direccion')} />
        </div>
        <Input id="contacto-telefono" label="Teléfono" placeholder="+57 322 123 4567" inputMode="tel" error={errors.telefono?.message} {...register('telefono')} />
        <Input id="contacto-correo" label="Correo" type="email" placeholder="contacto@pintuclic.com" error={errors.correo?.message} {...register('correo')} />
      </div>

      <fieldset className="space-y-3 rounded-card border border-neutral-light p-4">
        <legend className="px-1 font-title text-sm font-semibold text-corporate">Redes sociales</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input id="contacto-facebook" label="Facebook" placeholder="https://www.facebook.com/…" error={errors.facebook?.message} {...register('facebook')} />
          <Input id="contacto-instagram" label="Instagram" placeholder="https://www.instagram.com/…" error={errors.instagram?.message} {...register('instagram')} />
          <Input id="contacto-youtube" label="YouTube" placeholder="https://www.youtube.com/…" error={errors.youtube?.message} {...register('youtube')} />
          <Input id="contacto-tiktok" label="TikTok" placeholder="https://www.tiktok.com/@…" error={errors.tiktok?.message} {...register('tiktok')} />
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-light pt-4">
        <p className="font-sans text-xs text-neutral-medium">
          {ultimo?.fechaActualizacion
            ? `Última edición: ${new Date(ultimo.fechaActualizacion).toLocaleString('es-CO')}${ultimo.actualizadoPor ? ` por ${ultimo.actualizadoPor}` : ''}.`
            : 'Todavía no se han cargado datos de contacto.'}
        </p>
        <Button type="submit" variant="primary-action" isLoading={isSubmitting} disabled={!isDirty}>
          Guardar contacto
        </Button>
      </div>
    </form>
  );
};
