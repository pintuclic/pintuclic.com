'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Check, X } from 'lucide-react';
import { Alert, Button, ButtonLink, Container, Modal, Skeleton, Textarea } from '@/core/components';
import { avisarCarritoActualizado } from '@/core/utils/eventos-carrito';
import type { CotizacionDetalle } from '../dtos/m21-cotizaciones.dto';
import { rechazoClienteFormSchema, type RechazoClienteFormData } from '../dtos/formularios.dto';
import { cotizacionesApi, mensajeDeError } from '../services/cotizaciones-api';
import { fechaCorta, textoSiguientePaso } from '../services/textos-cotizaciones';
import { EstadoCotizacionBadge, TablaLineas, Totales } from './comunes';

/** /cotizaciones/:id: detalle para el cliente, con Aceptar y Rechazar mientras está respondida (R8, R9). */
export function CotizacionClienteView({ idCotizacion }: { idCotizacion: number }) {
  const [c, setC] = useState<CotizacionDetalle | null>(null);
  const [noDisponible, setNoDisponible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aceptando, setAceptando] = useState(false);
  const [rechazando, setRechazando] = useState(false);
  const [aceptada, setAceptada] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RechazoClienteFormData>({ resolver: zodResolver(rechazoClienteFormSchema), defaultValues: { motivo: '' } });

  useEffect(() => {
    let vigente = true;
    cotizacionesApi
      .miCotizacion(idCotizacion)
      .then((d) => vigente && setC(d))
      .catch(() => vigente && setNoDisponible(true));
    return () => {
      vigente = false;
    };
  }, [idCotizacion]);

  const aceptar = async (): Promise<void> => {
    setAceptando(true);
    setError(null);
    try {
      setC(await cotizacionesApi.aceptar(idCotizacion));
      setAceptada(true);
      avisarCarritoActualizado();
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'No fue posible aceptar la cotización.'));
    } finally {
      setAceptando(false);
    }
  };

  const rechazar = async (datos: RechazoClienteFormData): Promise<void> => {
    setError(null);
    try {
      setC(await cotizacionesApi.rechazarComoCliente(idCotizacion, datos.motivo));
      setRechazando(false);
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'No fue posible rechazar la cotización.'));
      setRechazando(false);
    }
  };

  if (noDisponible) {
    return (
      <Container className="min-h-[60vh] py-12 text-center">
        <h1 className="font-title text-2xl font-bold text-corporate">Esta cotización no está disponible</h1>
        <p className="mt-2 text-sm text-neutral-medium">Revisa que hayas iniciado sesión con la cuenta que la pidió.</p>
        <ButtonLink href="/cotizaciones" className="mt-4">
          Ver mis cotizaciones
        </ButtonLink>
      </Container>
    );
  }

  return (
    <Container className="min-h-[60vh] py-8">
      <Link href="/cotizaciones" className="inline-flex items-center gap-1 font-title text-sm font-medium text-action hover:text-action-hover">
        <ArrowLeft aria-hidden className="h-4 w-4" />
        Mis cotizaciones
      </Link>

      {c === null ? (
        <div className="mt-4 space-y-3">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-64" />
        </div>
      ) : (
        <div className="mt-4 space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-title text-2xl font-bold text-corporate sm:text-3xl">Cotización {c.codigo}</h1>
            <EstadoCotizacionBadge estado={c.estado} />
          </div>
          <p className="text-sm text-neutral-medium">
            Pedida el {fechaCorta(c.fechaCreacion)}
            {c.fechaVencimiento !== null && ` · Vigente hasta el ${fechaCorta(c.fechaVencimiento)}`}
          </p>

          <div aria-live="polite" className="space-y-3">
            {aceptada && (
              <Alert variant="success" title="¡Cotización aceptada!">
                Sus productos ya están en tu carrito con el precio acordado.{' '}
                <Link href="/carrito" className="font-semibold text-action hover:text-action-hover">
                  Ir al carrito
                </Link>
              </Alert>
            )}
            {error !== null && <Alert variant="error">{error}</Alert>}
            {!aceptada && <Alert variant="info">{textoSiguientePaso(c.estado, c.fechaVencimiento)}</Alert>}
          </div>

          <div className="grid items-start gap-6 lg:grid-cols-[1fr_22rem]">
            <TablaLineas cotizacion={c} />
            <aside className="space-y-4 rounded-card border border-neutral-light bg-neutral-white p-5 shadow-card lg:sticky lg:top-6">
              <Totales cotizacion={c} />
              {c.notaParaCliente !== null && (
                <div className="rounded-card bg-subaction p-3 text-sm text-corporate">
                  <p className="font-semibold">Nota de nuestro equipo</p>
                  <p className="mt-1 whitespace-pre-line">{c.notaParaCliente}</p>
                </div>
              )}
              {c.comentarioCliente !== null && (
                <p className="text-sm text-neutral-dark">
                  <span className="font-semibold">Tu comentario: </span>
                  {c.comentarioCliente}
                </p>
              )}
              {c.motivoRechazo !== null && (
                <p className="text-sm text-danger-hover">
                  <span className="font-semibold">Motivo del rechazo: </span>
                  {c.motivoRechazo}
                </p>
              )}
              {c.estado === 'enviada' && (
                <div className="space-y-2">
                  <Button variant="primary-conversion" fullWidth isLoading={aceptando} onClick={() => void aceptar()} leftIcon={<Check aria-hidden className="h-4 w-4" />}>
                    Aceptar y pasar al carrito
                  </Button>
                  <Button variant="ghost" fullWidth disabled={aceptando} onClick={() => setRechazando(true)} leftIcon={<X aria-hidden className="h-4 w-4" />}>
                    Rechazar
                  </Button>
                </div>
              )}
            </aside>
          </div>
        </div>
      )}

      <Modal isOpen={rechazando} onClose={() => setRechazando(false)} title="Rechazar cotización" size="md">
        <form noValidate className="space-y-4 py-2" onSubmit={(e) => void handleSubmit(rechazar)(e)}>
          <Textarea
            id="motivo-rechazo-cliente"
            label="¿Por qué la rechazas? (opcional)"
            rows={3}
            {...register('motivo')}
            {...(errors.motivo?.message === undefined ? {} : { error: errors.motivo.message })}
          />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setRechazando(false)} disabled={isSubmitting}>
              Volver
            </Button>
            <Button type="submit" variant="danger" isLoading={isSubmitting}>
              Rechazar cotización
            </Button>
          </div>
        </form>
      </Modal>
    </Container>
  );
}
