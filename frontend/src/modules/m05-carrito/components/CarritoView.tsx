'use client';

import Link from 'next/link';
import { ArrowLeft, FileText, ShoppingCart } from 'lucide-react';
import { Alert, Button, ButtonLink, Container, Skeleton } from '@/core/components';
import { BotonContactoDirecto } from '@/modules/m15-atencion/components/publico/BotonContactoDirecto';
import { SolicitarCotizacion } from '@/modules/m21-cotizaciones/components/SolicitarCotizacion';
import { useCarrito } from '../hooks/useCarrito';
import { referenciaWhatsapp, textoAviso, textoCambio, textoSiguientePaso, textoUnion } from '../services/textos-carrito';
import { CuponForm } from './CuponForm';
import { LineaCarritoItem } from './LineaCarritoItem';
import { ResumenCarrito } from './ResumenCarrito';

/** Pantalla /carrito (HU-CAR-01, 02, 04, 05). */
export function CarritoView() {
  const c = useCarrito();
  const carrito = c.carrito;
  const calculo = carrito?.calculo ?? null;
  const union = carrito?.union === null || carrito?.union === undefined ? null : textoUnion(carrito.union);
  const hayNoVendibles = carrito?.lineas.some((l) => l.precio?.vendible !== true) ?? false;

  return (
    <Container className="min-h-[60vh] py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-title text-2xl font-bold text-corporate sm:text-3xl">Tu carrito</h1>
          {carrito !== null && carrito.lineas.length > 0 && (
            <p className="mt-1 text-sm text-neutral-medium">
              {carrito.cantidadItems} {carrito.cantidadItems === 1 ? 'unidad' : 'unidades'} en {carrito.lineas.length}{' '}
              {carrito.lineas.length === 1 ? 'producto' : 'productos'}
            </p>
          )}
        </div>
        {carrito !== null && carrito.lineas.length > 0 && (
          <Link
            href="/productos"
            className="inline-flex items-center gap-1 font-title text-sm font-medium text-action hover:text-action-hover"
          >
            <ArrowLeft aria-hidden className="h-4 w-4" />
            Seguir comprando
          </Link>
        )}
      </div>

      <div className="mt-4 space-y-3" aria-live="polite">
        {union !== null && <Alert variant="info">{union}</Alert>}
        {c.error !== null && <Alert variant="error">{c.error}</Alert>}
        {c.cambios.length > 0 && carrito !== null && (
          <Alert variant="warning" title="Tu carrito cambió">
            <ul className="list-disc space-y-1 pl-5">
              {c.cambios.map((cambio, i) => (
                <li key={`${cambio.tipo}-${i}`}>{textoCambio(cambio, carrito)}</li>
              ))}
            </ul>
            <p className="mt-2">{textoSiguientePaso(c.cambios)}</p>
          </Alert>
        )}
      </div>

      {c.cargando && carrito === null ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem]">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : carrito === null || carrito.lineas.length === 0 ? (
        <div className="mx-auto mt-6 flex max-w-xl flex-col items-center gap-4 rounded-card border border-neutral-light bg-neutral-white px-6 py-12 text-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-subaction">
            <ShoppingCart aria-hidden className="h-10 w-10 text-action" />
          </span>
          <h2 className="font-title text-xl font-bold text-neutral-black">Tu carrito está vacío</h2>
          <p className="text-neutral-dark">
            Explora el catálogo, elige la presentación y el color, y pulsa «Agregar al carrito».
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <ButtonLink href="/productos">Ver productos</ButtonLink>
            <ButtonLink href="/ofertas" variant="outline">
              Ver ofertas
            </ButtonLink>
            {/* M21: las cotizaciones siguen disponibles aunque el carrito esté vacío. */}
            {c.haySesion && (
              <ButtonLink href="/cotizaciones" variant="outline" leftIcon={<FileText aria-hidden className="h-4 w-4" />}>
                Mis cotizaciones
              </ButtonLink>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_24rem]">
          <section
            aria-label="Productos en tu carrito"
            className="overflow-hidden rounded-card border border-neutral-light bg-neutral-white shadow-card"
          >
            <ul className="divide-y divide-neutral-light">
              {carrito.lineas.map((linea) => (
                <LineaCarritoItem
                  key={linea.idLinea}
                  linea={linea}
                  ocupada={c.ocupado !== null}
                  onCambiarCantidad={(cantidad) => void c.cambiarCantidad(linea.idLinea, cantidad)}
                  onQuitar={() => void c.quitar(linea.idLinea)}
                />
              ))}
            </ul>
          </section>

          <aside className="space-y-4 lg:sticky lg:top-6">
            <div className="space-y-5 rounded-card border border-neutral-light bg-neutral-white p-5 shadow-card">
              <h2 className="font-title text-lg font-bold text-corporate">Resumen de tu compra</h2>
              {calculo === null ? (
                <Alert variant="warning">No pudimos calcular los precios en este momento. Intenta de nuevo más tarde.</Alert>
              ) : (
                <ResumenCarrito resumen={calculo.resumen} />
              )}

              {calculo?.avisos.map((aviso) =>
                aviso.tipo === 'empresa_falta_monto' ? (
                  <Alert key={aviso.tipo} variant="info">
                    {textoAviso(aviso)}
                  </Alert>
                ) : (
                  <Alert key={aviso.tipo} variant="info">
                    {textoAviso(aviso)}{' '}
                    <Link href="/perfil?seccion=empresa" className="font-semibold text-action underline hover:text-action-hover">
                      Solicitar cuenta empresa
                    </Link>
                  </Alert>
                ),
              )}

              <CuponForm
                codigoActual={c.codigoCupon}
                resultado={calculo?.cupon ?? null}
                ocupado={c.ocupado?.tipo === 'cupon'}
                onAplicar={(codigo) => void c.aplicarCupon(codigo)}
              />

              <Button
                variant="primary-conversion"
                fullWidth
                isLoading={c.ocupado?.tipo === 'continuar'}
                disabled={c.ocupado !== null || calculo === null || hayNoVendibles}
                onClick={() => void c.continuar()}
              >
                Continuar con la compra
              </Button>
              {hayNoVendibles && (
                <p className="text-sm text-danger-hover">Quita los productos que ya no están disponibles para continuar.</p>
              )}
              {!c.haySesion && (
                <p className="text-sm text-neutral-medium">Te pediremos iniciar sesión antes de pagar.</p>
              )}
            </div>

            {/* M21: pedir un precio especial con lo que hay en el carrito. */}
            <div className="rounded-card border border-neutral-light bg-neutral-white p-5 shadow-card">
              <SolicitarCotizacion />
            </div>

            <div className="rounded-card border border-neutral-light bg-neutral-white p-5 shadow-card">
              <p className="mb-3 font-title text-sm font-semibold text-neutral-black">¿Tienes dudas sobre tu compra?</p>
              <BotonContactoDirecto referencia={referenciaWhatsapp(carrito.cantidadItems)} />
            </div>
          </aside>
        </div>
      )}
    </Container>
  );
}
