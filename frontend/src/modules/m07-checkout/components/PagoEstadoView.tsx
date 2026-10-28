'use client';

import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CircleCheck, Loader2, Smartphone } from 'lucide-react';
import { Alert, Button, ButtonLink, Checkbox, Container, Input, Skeleton, Stepper } from '@/core/components';
import { avisarCarritoActualizado } from '@/core/utils/eventos-carrito';
import { INTERVALO_CONSULTA_PANTALLA_SEGUNDOS, MAXIMO_INTENTOS_PAGO, type Solicitud, type TerminosWompi } from '../dtos/m07-checkout.dto';
import { reintentoFormSchema, type ReintentoFormData, type ReintentoFormEntrada } from '../dtos/formularios.dto';
import { checkoutApi, mensajeDeError } from '../services/checkout-api';
import { PASOS_COMPRA, pasoDe, sigueEnCurso } from '../services/textos-checkout';
import { EstadoSolicitudBadge, ResumenCompra, type LineaResumen } from './comunes';

function lineasDe(s: Solicitud): LineaResumen[] {
  return s.lineas.map((l, i) => ({
    clave: String(i),
    nombre: l.nombreProducto,
    detalle: [l.color?.nombre, l.medida].filter(Boolean).join(' · ') || null,
    colorHexadecimal: l.color?.hexadecimal ?? null,
    cantidad: l.cantidad,
    subtotal: l.subtotal,
  }));
}

/** Reintentar con Nequi (R4): celular y las dos casillas de Wompi. */
function Reintento({ solicitud, onListo }: { solicitud: Solicitud; onListo: (s: Solicitud) => void }) {
  const [terminos, setTerminos] = useState<TerminosWompi | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ReintentoFormEntrada, unknown, ReintentoFormData>({
    resolver: zodResolver(reintentoFormSchema),
    defaultValues: { celularNequi: '', aceptaReglamento: false, aceptaDatos: false },
  });

  useEffect(() => {
    let vigente = true;
    checkoutApi
      .preparar(null)
      .then((p) => vigente && setTerminos(p.terminos))
      .catch(() => vigente && setTerminos(null));
    return () => {
      vigente = false;
    };
  }, []);

  const reintentar = async (f: ReintentoFormData): Promise<void> => {
    if (terminos === null) return;
    setError(null);
    try {
      onListo(
        await checkoutApi.reintentar(solicitud.codigo, {
          celularNequi: f.celularNequi,
          aceptaciones: { tokenAceptacion: terminos.tokenAceptacion, tokenDatosPersonales: terminos.tokenDatosPersonales, aceptaTerminos: true },
        }),
      );
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'No fue posible reintentar el pago.'));
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(reintentar)(e)} noValidate className="space-y-4">
      {error !== null && <Alert variant="error">{error}</Alert>}
      <Input
        id="celularNequi"
        label="Celular de Nequi"
        type="tel"
        inputMode="numeric"
        leftIcon={<Smartphone aria-hidden className="h-4 w-4" />}
        error={errors.celularNequi?.message}
        {...register('celularNequi')}
      />
      {terminos !== null && (
        <>
          <Checkbox
            id="aceptaReglamento"
            label={
              <>
                Acepto el{' '}
                <a href={terminos.enlaceReglamento} target="_blank" rel="noopener noreferrer" className="font-semibold text-action underline">
                  reglamento de Wompi
                </a>
                .
              </>
            }
            error={errors.aceptaReglamento?.message}
            {...register('aceptaReglamento')}
          />
          <Checkbox
            id="aceptaDatos"
            label={
              <>
                Autorizo el{' '}
                <a href={terminos.enlaceDatosPersonales} target="_blank" rel="noopener noreferrer" className="font-semibold text-action underline">
                  tratamiento de mis datos personales
                </a>{' '}
                por Wompi.
              </>
            }
            error={errors.aceptaDatos?.message}
            {...register('aceptaDatos')}
          />
        </>
      )}
      <Button type="submit" variant="primary-conversion" fullWidth isLoading={isSubmitting} disabled={terminos === null}>
        Intentar de nuevo con Nequi
      </Button>
    </form>
  );
}

/** /checkout/:codigo: espera la respuesta de Nequi y muestra el resultado (R3–R8). */
export function PagoEstadoView({ codigo }: { codigo: string }) {
  const [s, setS] = useState<Solicitud | null>(null);
  const [noDisponible, setNoDisponible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState(false);

  const consultar = useCallback(async (): Promise<void> => {
    try {
      setS(await checkoutApi.obtener(codigo));
    } catch {
      setNoDisponible(true);
    }
  }, [codigo]);

  useEffect(() => {
    void consultar();
  }, [consultar]);

  // Mientras Nequi no responda o el pedido no exista, se vuelve a preguntar.
  const enCurso = s !== null && sigueEnCurso(s);
  useEffect(() => {
    if (!enCurso) return;
    const t = setInterval(() => void consultar(), INTERVALO_CONSULTA_PANTALLA_SEGUNDOS * 1000);
    return () => clearInterval(t);
  }, [enCurso, consultar]);

  // Con el pedido creado, el carrito ya no tiene lo comprado: la cabecera vuelve a leerlo.
  const completada = s?.estado === 'completada';
  useEffect(() => {
    if (completada) avisarCarritoActualizado();
  }, [completada]);

  const cancelar = async (): Promise<void> => {
    setCancelando(true);
    setError(null);
    try {
      setS(await checkoutApi.cancelar(codigo));
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'No fue posible cancelar la compra.'));
    } finally {
      setCancelando(false);
    }
  };

  if (noDisponible) {
    return (
      <Container className="min-h-[60vh] py-12 text-center">
        <h1 className="font-title text-2xl font-bold text-corporate">Esta compra no está disponible</h1>
        <p className="mt-2 text-sm text-neutral-medium">Revisa que hayas iniciado sesión con la cuenta que la hizo.</p>
        <ButtonLink href="/carrito" className="mt-4">
          Ir al carrito
        </ButtonLink>
      </Container>
    );
  }
  if (s === null) {
    return (
      <Container className="min-h-[60vh] py-8">
        <Skeleton className="h-96" />
      </Container>
    );
  }

  const ultimo = s.intentos.at(-1);
  return (
    <Container className="min-h-[60vh] py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-title text-2xl font-bold text-corporate md:text-3xl">Tu compra {s.codigo}</h1>
        <EstadoSolicitudBadge estado={s.estado} />
      </div>
      <div className="mt-4 max-w-xl">
        <Stepper steps={PASOS_COMPRA} current={pasoDe(s.estado)} ariaLabel="Pasos de la compra" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_24rem] lg:items-start">
        <section aria-live="polite" className="space-y-4 rounded-card border border-neutral-light/70 bg-neutral-white p-6 shadow-card">
          {error !== null && <Alert variant="error">{error}</Alert>}

          {s.estado === 'en_pago' && (
            <div className="space-y-3 text-center">
              <Loader2 aria-hidden className="mx-auto h-10 w-10 animate-spin text-action" />
              <h2 className="font-title text-xl font-bold text-corporate">Revisa tu celular y acepta el pago en Nequi</h2>
              <p className="text-sm text-neutral-dark">
                Enviamos la solicitud de pago al Nequi {ultimo?.celularEnmascarado ?? ''}. Abre la app y acéptala. Esta página se
                actualiza sola.
              </p>
            </div>
          )}

          {s.estado === 'pagada' && (
            <div className="space-y-3 text-center">
              <Loader2 aria-hidden className="mx-auto h-10 w-10 animate-spin text-conversion" />
              <h2 className="font-title text-xl font-bold text-corporate">Recibimos tu pago</h2>
              <p className="text-sm text-neutral-dark">Estamos registrando tu pedido. Esto tarda solo unos segundos.</p>
            </div>
          )}

          {s.estado === 'completada' && (
            <div className="space-y-3 text-center">
              <CircleCheck aria-hidden className="mx-auto h-12 w-12 text-conversion" />
              <h2 className="font-title text-2xl font-bold text-corporate">¡Compra confirmada!</h2>
              <p className="text-sm text-neutral-dark">
                Tu pedido es el <span className="font-semibold text-neutral-black">{s.codigoOrden}</span>. Puedes seguir su estado
                en Mis pedidos.
              </p>
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                {s.codigoOrden !== null && <ButtonLink href={`/perfil/pedidos/${s.codigoOrden}`}>Ver mi pedido</ButtonLink>}
                <ButtonLink href="/productos" variant="outline">
                  Seguir comprando
                </ButtonLink>
              </div>
            </div>
          )}

          {s.estado === 'en_revision' && (
            <Alert variant="info" title="Recibimos tu pago y lo estamos revisando">
              Nuestro equipo confirmará tu pedido muy pronto. No hace falta que pagues de nuevo.
            </Alert>
          )}

          {s.estado === 'rechazada' && (
            <div className="space-y-4">
              <Alert variant="error" title="El pago no se completó">
                {ultimo?.motivo ?? 'Nequi no aprobó el pago.'}
              </Alert>
              {s.intentos.length < MAXIMO_INTENTOS_PAGO ? (
                <Reintento solicitud={s} onListo={setS} />
              ) : (
                <p className="text-sm text-neutral-dark">Llegaste al máximo de intentos. Vuelve al carrito para empezar de nuevo.</p>
              )}
              <div className="flex flex-wrap gap-3">
                <ButtonLink href="/carrito" variant="outline">
                  Volver al carrito
                </ButtonLink>
                <Button variant="ghost" isLoading={cancelando} onClick={() => void cancelar()}>
                  Cancelar compra
                </Button>
              </div>
            </div>
          )}

          {(s.estado === 'vencida' || s.estado === 'cancelada') && (
            <div className="space-y-4">
              <Alert variant="info" title={s.estado === 'vencida' ? 'Esta compra venció' : 'Cancelaste esta compra'}>
                No se hizo ningún cobro. Tus productos siguen en el carrito.
              </Alert>
              <ButtonLink href="/carrito">Volver al carrito</ButtonLink>
            </div>
          )}
        </section>

        <ResumenCompra
          lineas={lineasDe(s)}
          subtotal={s.resumen.subtotalInicial}
          descuento={s.resumen.descuentoTotal}
          envio={s.costoEnvio}
          total={s.totalACobrar}
        />
      </div>
    </Container>
  );
}
