'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Smartphone, Store, Truck } from 'lucide-react';
import { Alert, Button, ButtonLink, Checkbox, Container, Input, Skeleton, Stepper } from '@/core/components';
import { formatCOP } from '@/core/utils/moneda';
import type { CambioRevalidacion } from '@/modules/m05-carrito/dtos/m05-carrito.dto';
import { pantallaDe, textoCambio } from '@/modules/m05-carrito/services/textos-carrito';
import type { MedioPago, ModoEntrega, PrepararCheckout } from '../dtos/m07-checkout.dto';
import { pagoFormSchema, type PagoFormData, type PagoFormEntrada } from '../dtos/formularios.dto';
import {
  checkoutApi,
  codigoDeError,
  mensajeDeError,
  pagoEnCursoDeError,
  requiereSesion,
  revalidacionDeError,
} from '../services/checkout-api';
import { compraDirectaDeUrl, PASOS_COMPRA, PASOS_COMPRA_DIRECTA, urlPaginaWompi } from '../services/textos-checkout';
import { AvisoPaginaWompi, ResumenCompra, SelectorMedioPago, type LineaResumen } from './comunes';

const VACIO: PagoFormEntrada = {
  modoEntrega: 'domicilio',
  direccion: '',
  barrio: '',
  apartamentoCasa: '',
  nombreRecibe: '',
  telefonoRecibe: '',
  medio: 'nequi',
  celularNequi: '',
  aceptaReglamento: false,
  aceptaDatos: false,
};

function lineasDe(p: PrepararCheckout): LineaResumen[] {
  return p.carrito.lineas.map((l) => ({
    clave: String(l.idLinea),
    nombre: l.producto.nombre ?? 'Producto',
    detalle: [l.producto.color?.nombre, l.producto.medida].filter(Boolean).join(' · ') || null,
    colorHexadecimal: l.producto.color?.hexadecimal ?? null,
    cantidad: l.cantidad,
    subtotal: l.precio?.subtotal ?? 0,
  }));
}

/**
 * /checkout: entrega, medio de pago (Nequi con su celular y los términos de Wompi, o la página de Wompi, R19) y
 * resumen con el botón de pagar (contrato M07 · R2). Con `?idVariante=…` paga solo ese producto desde la ficha,
 * sin el carrito (R17).
 */
export function CheckoutView() {
  const router = useRouter();
  const params = useSearchParams();
  const directa = useMemo(() => compraDirectaDeUrl(params), [params]);
  // D9: la compra directa no lleva cupón.
  const cupon = directa === null ? params.get('cupon') : null;
  const consulta = params.toString();
  const [datos, setDatos] = useState<PrepararCheckout | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cambios, setCambios] = useState<readonly CambioRevalidacion[]>([]);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PagoFormEntrada, unknown, PagoFormData>({ resolver: zodResolver(pagoFormSchema), defaultValues: VACIO });
  const modo = watch('modoEntrega');
  const medio = watch('medio');
  // La casilla del Core Kit dibuja la marca con `checked`.
  const aceptaReglamento = watch('aceptaReglamento');
  const aceptaDatos = watch('aceptaDatos');

  const cargar = useCallback(async (): Promise<void> => {
    try {
      const p = await checkoutApi.preparar(cupon, directa);
      setDatos(p);
      const d = p.direccionPerfil;
      reset({
        ...VACIO,
        direccion: d?.direccion ?? '',
        barrio: d?.barrio ?? '',
        apartamentoCasa: d?.apartamentoCasa ?? '',
        nombreRecibe: d?.nombreRecibe ?? '',
        telefonoRecibe: d?.telefonoRecibe ?? '',
        celularNequi: p.celularSugerido ?? '',
      });
    } catch (err: unknown) {
      if (requiereSesion(err)) {
        // Sin sesión: se inicia y se vuelve a esta misma compra (RF-CAR-01-02).
        const destino = directa === null ? '/carrito' : `/checkout?${consulta}`;
        router.replace(`/login?destino=${encodeURIComponent(destino)}`);
        return;
      }
      setError(mensajeDeError(err, 'No fue posible preparar el pago. Inténtalo de nuevo.'));
    }
  }, [cupon, directa, consulta, reset, router]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const pagar = async (f: PagoFormData): Promise<void> => {
    if (datos === null || datos.terminos === null) return;
    const terminos = datos.terminos;
    setError(null);
    setCambios([]);
    try {
      const s = await checkoutApi.crear({
        pantalla: pantallaDe(datos.carrito, cupon),
        ...(directa === null ? {} : { directa }),
        modoEntrega: f.modoEntrega,
        direccion:
          f.modoEntrega === 'domicilio'
            ? {
                direccion: f.direccion,
                barrio: f.barrio,
                apartamentoCasa: f.apartamentoCasa === '' ? null : f.apartamentoCasa,
                nombreRecibe: f.nombreRecibe,
                telefonoRecibe: f.telefonoRecibe,
              }
            : null,
        ...(f.medio === 'nequi'
          ? {
              medio: 'nequi' as const,
              celularNequi: f.celularNequi,
              aceptaciones: {
                tokenAceptacion: terminos.tokenAceptacion,
                tokenDatosPersonales: terminos.tokenDatosPersonales,
                aceptaTerminos: true as const,
              },
            }
          : { medio: 'pagina_wompi' as const }),
      });
      // R19: a pagar en la página de Wompi; vuelve a /checkout/<SOL> de esta misma tienda.
      if (s.pagoWompi !== null) {
        window.location.assign(urlPaginaWompi(s.pagoWompi, `${window.location.origin}/checkout/${s.codigo}`));
        return;
      }
      router.push(`/checkout/${s.codigo}`);
    } catch (err: unknown) {
      const enCurso = pagoEnCursoDeError(err);
      if (enCurso !== null) {
        router.push(`/checkout/${enCurso}`);
        return;
      }
      const revalidacion = revalidacionDeError(err);
      if (revalidacion !== null) {
        setCambios(revalidacion.cambios);
        setDatos((d) => (d === null ? d : { ...d, carrito: revalidacion.carrito }));
      }
      if (codigoDeError(err) === 'CUPON_NO_DISPONIBLE') {
        setError(mensajeDeError(err, 'El cupón ya no se puede usar.'));
        return;
      }
      setError(mensajeDeError(err, 'No fue posible iniciar el pago. Inténtalo de nuevo.'));
    }
  };

  const elegirModo = (m: ModoEntrega): void => setValue('modoEntrega', m, { shouldValidate: false });
  const elegirMedio = (m: MedioPago): void => setValue('medio', m, { shouldValidate: false });

  if (datos === null) {
    return (
      <Container className="min-h-[60vh] py-8">
        {error !== null ? (
          <div className="space-y-4">
            <Alert variant="error">{error}</Alert>
            <ButtonLink href={directa === null ? '/carrito' : '/productos'} variant="outline">
              {directa === null ? 'Volver al carrito' : 'Ver productos'}
            </ButtonLink>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        )}
      </Container>
    );
  }

  const resumen = datos.carrito.calculo?.resumen ?? null;
  if (datos.carrito.lineas.length === 0 || resumen === null) {
    return (
      <Container className="min-h-[60vh] py-12 text-center">
        <h1 className="font-title text-2xl font-bold text-corporate">Tu carrito está vacío</h1>
        <p className="mt-2 text-sm text-neutral-medium">Agrega productos antes de pagar.</p>
        <ButtonLink href="/productos" className="mt-4">
          Ver productos
        </ButtonLink>
      </Container>
    );
  }

  const envio = modo === 'recogida' ? datos.envio.recogida : datos.envio.domicilio;
  const sinPasarela = datos.terminos === null;
  // R17: en la compra directa M05 no filtró antes; una línea que no se vende no se paga.
  const noVendible = datos.carrito.lineas.some((l) => l.precio?.vendible !== true);

  return (
    <Container className="min-h-[60vh] py-8">
      {directa === null ? (
        <Link href="/carrito" className="inline-flex items-center gap-1 font-title text-sm font-medium text-action hover:text-action-hover">
          <ArrowLeft aria-hidden className="h-4 w-4" />
          Volver al carrito
        </Link>
      ) : (
        <Button variant="ghost" size="sm" leftIcon={<ArrowLeft aria-hidden className="h-4 w-4" />} onClick={() => router.back()}>
          Volver al producto
        </Button>
      )}
      <h1 className="mt-3 font-title text-2xl font-bold text-corporate md:text-3xl">Finaliza tu compra</h1>
      <div className="mt-4 max-w-xl">
        <Stepper steps={directa === null ? PASOS_COMPRA : PASOS_COMPRA_DIRECTA} current={1} ariaLabel="Pasos de la compra" />
      </div>

      <div className="mt-6 space-y-3" aria-live="polite">
        {datos.solicitudEnCurso !== null && (
          <Alert variant="info" title="Tienes un pago en curso">
            Termínalo o espera a que se confirme antes de empezar otra compra.{' '}
            <Link href={`/checkout/${datos.solicitudEnCurso}`} className="font-semibold underline">
              Ver ese pago
            </Link>
          </Alert>
        )}
        {noVendible && (
          <Alert variant="error" title="Este producto no está disponible">
            Ya no se puede comprar en esta presentación o color. Vuelve a la ficha y elige otra opción.
          </Alert>
        )}
        {sinPasarela && (
          <Alert variant="warning" title="Los pagos no están disponibles en este momento">
            Inténtalo de nuevo en unos minutos. Si necesitas ayuda, escríbenos por WhatsApp desde el carrito.
          </Alert>
        )}
        {cambios.length > 0 && (
          <Alert variant="warning" title="Tu carrito cambió">
            <ul className="list-disc space-y-1 pl-5">
              {cambios.map((c, i) => (
                <li key={`${c.tipo}-${i}`}>{textoCambio(c, datos.carrito)}</li>
              ))}
            </ul>
            <p className="mt-2">Revisa el resumen. Si todo está bien, vuelve a pulsar el botón de pagar.</p>
          </Alert>
        )}
        {error !== null && <Alert variant="error">{error}</Alert>}
      </div>

      <form onSubmit={(e) => void handleSubmit(pagar)(e)} noValidate className="mt-6 grid gap-6 lg:grid-cols-[1fr_24rem] lg:items-start">
        <div className="space-y-6">
          <section aria-labelledby="titulo-entrega" className="space-y-4 rounded-card border border-neutral-light/70 bg-neutral-white p-5 shadow-card">
            <h2 id="titulo-entrega" className="font-title text-lg font-bold text-corporate">
              ¿Cómo quieres recibirlo?
            </h2>
            <div role="group" aria-label="Forma de entrega" className="grid gap-3 sm:grid-cols-2">
              <Button
                type="button"
                variant="selection"
                selected={modo === 'domicilio'}
                aria-pressed={modo === 'domicilio'}
                onClick={() => elegirModo('domicilio')}
                leftIcon={<Truck aria-hidden className="h-5 w-5" />}
              >
                Envío a domicilio · {datos.envio.domicilio === 0 ? 'Gratis' : formatCOP(datos.envio.domicilio)}
              </Button>
              <Button
                type="button"
                variant="selection"
                selected={modo === 'recogida'}
                aria-pressed={modo === 'recogida'}
                onClick={() => elegirModo('recogida')}
                leftIcon={<Store aria-hidden className="h-5 w-5" />}
              >
                Recoger en el almacén · Gratis
              </Button>
            </div>
            {modo === 'domicilio' ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <p className="text-sm text-neutral-dark sm:col-span-2">
                  {datos.envio.domicilio === 0
                    ? 'Tu compra tiene envío gratis.'
                    : `Envío gratis en compras desde ${formatCOP(datos.envio.umbralEnvioGratis)}.`}{' '}
                  Esta dirección es solo para este pedido; no cambia la de tu perfil.
                </p>
                <div className="sm:col-span-2">
                  <Input id="direccion" label="Dirección" autoComplete="street-address" error={errors.direccion?.message} {...register('direccion')} />
                </div>
                <Input id="barrio" label="Barrio" error={errors.barrio?.message} {...register('barrio')} />
                <Input id="apartamentoCasa" label="Apartamento o casa (opcional)" error={errors.apartamentoCasa?.message} {...register('apartamentoCasa')} />
                <Input id="nombreRecibe" label="Quién recibe" autoComplete="name" error={errors.nombreRecibe?.message} {...register('nombreRecibe')} />
                <Input id="telefonoRecibe" label="Teléfono de quien recibe" type="tel" autoComplete="tel" error={errors.telefonoRecibe?.message} {...register('telefonoRecibe')} />
              </div>
            ) : (
              <p className="text-sm text-neutral-dark">Recógelo en el almacén cuando esté listo; verás su estado en Mis pedidos.</p>
            )}
          </section>

          <section aria-labelledby="titulo-pago" className="space-y-4 rounded-card border border-neutral-light/70 bg-neutral-white p-5 shadow-card">
            <h2 id="titulo-pago" className="font-title text-lg font-bold text-corporate">
              ¿Cómo quieres pagar?
            </h2>
            <SelectorMedioPago valor={medio} onCambiar={elegirMedio} />
            {medio === 'pagina_wompi' ? (
              <AvisoPaginaWompi />
            ) : (
              <>
                <Input
                  id="celularNequi"
                  label="Celular de Nequi"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  leftIcon={<Smartphone aria-hidden className="h-4 w-4" />}
                  helperText="Te llegará una notificación a la app de Nequi de este celular para aceptar el pago."
                  error={errors.celularNequi?.message}
                  {...register('celularNequi')}
                />
                {datos.terminos !== null && (
                  <div className="space-y-3">
                    <Checkbox
                      id="aceptaReglamento"
                      label={
                        <>
                          Acepto el{' '}
                          <a href={datos.terminos.enlaceReglamento} target="_blank" rel="noopener noreferrer" className="font-semibold text-action underline">
                            reglamento de Wompi
                          </a>
                          .
                    </>
                  }
                  error={errors.aceptaReglamento?.message}
                  checked={aceptaReglamento}
                  {...register('aceptaReglamento')}
                />
                <Checkbox
                  id="aceptaDatos"
                  label={
                    <>
                      Autorizo el{' '}
                      <a href={datos.terminos.enlaceDatosPersonales} target="_blank" rel="noopener noreferrer" className="font-semibold text-action underline">
                        tratamiento de mis datos personales
                      </a>{' '}
                      por Wompi.
                    </>
                  }
                  error={errors.aceptaDatos?.message}
                  checked={aceptaDatos}
                  {...register('aceptaDatos')}
                />
              </div>
            )}
              </>
            )}
          </section>
        </div>

        <div className="lg:sticky lg:top-28">
          <ResumenCompra
            lineas={lineasDe(datos)}
            subtotal={resumen.subtotalInicial}
            descuento={resumen.descuentoTotal}
            envio={envio}
            total={resumen.total + envio}
          >
            <Button type="submit" variant="primary-conversion" size="lg" fullWidth isLoading={isSubmitting} disabled={sinPasarela || noVendible || datos.solicitudEnCurso !== null}>
              {medio === 'nequi' ? 'Pagar con Nequi' : 'Ir a pagar'}
            </Button>
          </ResumenCompra>
        </div>
      </form>
    </Container>
  );
}
