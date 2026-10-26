'use client';

import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { Alert, Button, ButtonLink, Container, Skeleton } from '@/core/components';
import { BotonContactoDirecto } from '@/modules/m15-atencion/components/publico/BotonContactoDirecto';
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
    <Container className="py-8">
      <h1 className="font-title text-2xl font-bold text-corporate">Tu carrito</h1>

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
        {c.listoParaPagar && (
          <Alert variant="success" title="Tu carrito está listo">
            Revisamos precios y disponibilidad y todo sigue igual. El pago en línea estará disponible muy pronto.
          </Alert>
        )}
      </div>

      {c.cargando && carrito === null ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem]">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : carrito === null || carrito.lineas.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-4 text-center">
          <ShoppingCart aria-hidden className="h-12 w-12 text-neutral-medium" />
          <p className="text-lg text-neutral-dark">Tu carrito está vacío.</p>
          <ButtonLink href="/productos">Ver productos</ButtonLink>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem]">
          <section aria-label="Productos en tu carrito" className="rounded-card border border-neutral-light bg-neutral-white px-4">
            <ul>
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

          <aside className="space-y-4">
            <div className="space-y-4 rounded-card border border-neutral-light bg-neutral-white p-4">
              <h2 className="font-title text-lg font-bold text-corporate">Resumen</h2>
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

            <div className="rounded-card border border-neutral-light bg-neutral-white p-4">
              <p className="mb-3 text-sm text-neutral-dark">¿Tienes dudas sobre tu compra?</p>
              <BotonContactoDirecto referencia={referenciaWhatsapp(carrito.cantidadItems)} />
            </div>
          </aside>
        </div>
      )}
    </Container>
  );
}
