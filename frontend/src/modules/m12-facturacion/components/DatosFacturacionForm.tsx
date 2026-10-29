'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { Alert, Button, Input, Skeleton } from '@/core/components';
import { mensajeDeError } from '@/core/utils/errorApi';
import { editarDatosFacturacionRequestSchema, type DatosFacturacion, type EditarDatosFacturacionRequest } from '../dtos/m12-facturacion.dto';
import { guardarDatosFacturacion, obtenerDatosFacturacion } from '../services/facturacion-api';
import { textoFaltantes } from '../services/formato-comprobante';

type EntradaFormulario = z.input<typeof editarDatosFacturacionRequestSchema>;

const VACIO = { razonSocial: '', nit: '', regimen: '', direccion: '', ciudad: '', telefono: '', correo: '', pieLegal: '' };

const aFormulario = (d: DatosFacturacion) => ({
  razonSocial: d.razonSocial ?? '',
  nit: d.nit ?? '',
  regimen: d.regimen ?? '',
  direccion: d.direccion ?? '',
  ciudad: d.ciudad ?? '',
  telefono: d.telefono ?? '',
  correo: d.correo ?? '',
  pieLegal: d.pieLegal ?? '',
});

/**
 * Datos del vendedor que salen en cada comprobante de venta. Sin razón social, NIT y dirección no se emite ningún
 * comprobante; los comprobantes ya emitidos no cambian si se edita esta ficha.
 */
export const DatosFacturacionForm: React.FC = () => {
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ultimo, setUltimo] = useState<DatosFacturacion | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<EntradaFormulario, unknown, EditarDatosFacturacionRequest>({
    resolver: zodResolver(editarDatosFacturacionRequestSchema),
    defaultValues: VACIO,
  });

  const cargar = useCallback(async () => {
    setCargando(true);
    setErrorCarga(null);
    try {
      const d = await obtenerDatosFacturacion();
      setUltimo(d);
      reset(aFormulario(d));
    } catch (err: unknown) {
      setErrorCarga(mensajeDeError(err));
    } finally {
      setCargando(false);
    }
  }, [reset]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const guardar = async (valores: EditarDatosFacturacionRequest): Promise<void> => {
    setErrorGuardar(null);
    setAviso(null);
    try {
      const d = await guardarDatosFacturacion(valores);
      setUltimo(d);
      reset(aFormulario(d));
      setAviso('Datos de facturación guardados. Se usan desde el próximo comprobante.');
    } catch (err: unknown) {
      setErrorGuardar(mensajeDeError(err));
    }
  };

  if (cargando) return <Skeleton className="h-96 w-full" />;
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
    <form onSubmit={handleSubmit(guardar)} noValidate className="space-y-5" aria-label="Datos de facturación">
      {ultimo !== null && ultimo.faltantes.length > 0 && (
        <Alert variant="warning">
          Mientras falte {textoFaltantes(ultimo.faltantes)}, la tienda no emite comprobantes de venta. Los pedidos nuevos quedan con su comprobante pendiente y se emite apenas completes estos datos.
        </Alert>
      )}
      {errorGuardar !== null && <Alert variant="error">{errorGuardar}</Alert>}
      {aviso !== null && <Alert variant="success">{aviso}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Input id="fact-razon" label="Razón social *" placeholder="Pintu Clic S.A.S." error={errors.razonSocial?.message} {...register('razonSocial')} />
        <Input id="fact-nit" label="NIT *" placeholder="900.123.456-7" error={errors.nit?.message} {...register('nit')} />
        <div className="sm:col-span-2">
          <Input id="fact-regimen" label="Régimen o responsabilidad fiscal" placeholder="Responsable de IVA" error={errors.regimen?.message} {...register('regimen')} />
        </div>
        <Input id="fact-direccion" label="Dirección *" placeholder="Calle 10 # 5-20" error={errors.direccion?.message} {...register('direccion')} />
        <Input id="fact-ciudad" label="Ciudad" placeholder="Bogotá" error={errors.ciudad?.message} {...register('ciudad')} />
        <Input id="fact-telefono" label="Teléfono" inputMode="tel" error={errors.telefono?.message} {...register('telefono')} />
        <Input id="fact-correo" label="Correo" type="email" error={errors.correo?.message} {...register('correo')} />
        <div className="sm:col-span-2">
          <Input
            id="fact-pie"
            label="Texto legal al pie"
            placeholder="Documento sin validez fiscal ante la DIAN."
            helperText="Va bajo el total de cada comprobante. Siempre se agrega, además, que no es una factura electrónica."
            error={errors.pieLegal?.message}
            {...register('pieLegal')}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-light pt-4">
        <p className="font-sans text-xs text-neutral-medium">
          {ultimo?.fechaActualizacion ? `Última edición: ${new Date(ultimo.fechaActualizacion).toLocaleString('es-CO')}${ultimo.actualizadoPor ? ` por ${ultimo.actualizadoPor}` : ''}.` : 'Todavía no se han cargado los datos.'}
        </p>
        <Button type="submit" variant="primary-action" isLoading={isSubmitting} disabled={!isDirty}>
          Guardar datos
        </Button>
      </div>
    </form>
  );
};
