'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Alert, ButtonLink, Container, Skeleton } from '@/core/components';
import type { OrdenDetalleCliente } from '../../dtos/m08-ordenes.dto';
import { mensajeDeError } from '../../services/mensaje-error';
import { obtenerMiPedido } from '../../services/ordenes-api';
import { ETIQUETA_MODO_ENTREGA, formatearFecha } from '../../services/presentacion';
import { EstadoBadge } from '../EstadoBadge';
import { HistorialEstados } from '../HistorialEstados';
import { LineasOrdenLista } from '../LineasOrdenLista';
import { TotalesOrden } from '../TotalesOrden';
import { BotonPostventaOrden } from '@/modules/m11-postventa/components/cliente/BotonPostventaOrden';

/** HU-ORD-04 · Detalle de un pedido del cliente titular: qué compró, cuánto pagó y en qué estado está. */
export function PedidoDetalleClienteView({ codigo }: { codigo: string }) {
  const [orden, setOrden] = useState<OrdenDetalleCliente | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    setOrden(null);
    setError(null);
    obtenerMiPedido(codigo)
      .then((datos) => vigente && setOrden(datos))
      .catch((err: unknown) => vigente && setError(mensajeDeError(err, 'No pudimos abrir este pedido.')));
    return () => {
      vigente = false;
    };
  }, [codigo]);

  return (
    <div className="bg-neutral-lightest py-8">
      <Container>
        <div className="mx-auto max-w-3xl space-y-4">
          <ButtonLink href="/perfil/pedidos" variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Mis pedidos
          </ButtonLink>

          {error && <Alert variant="error" title="No pudimos abrir este pedido">{error}</Alert>}
          {!orden && !error && (
            <div className="space-y-4" aria-busy="true" aria-label="Cargando pedido">
              <Skeleton className="h-24" />
              <Skeleton className="h-48" />
            </div>
          )}

          {orden && (
            <>
              <header className="flex flex-wrap items-start justify-between gap-3 rounded-card bg-neutral-white p-4 shadow-card">
                <div>
                  <h1 className="font-title text-xl font-bold text-neutral-black">Pedido #{orden.codigo}</h1>
                  <p className="text-sm text-neutral-medium">
                    <time dateTime={orden.fecha}>{formatearFecha(orden.fecha)}</time>
                    {orden.modoEntrega ? ` · ${ETIQUETA_MODO_ENTREGA[orden.modoEntrega]}` : ''}
                  </p>
                  <BotonPostventaOrden
                    codigoOrden={orden.codigo}
                    estadoOrden={orden.estado}
                    lineas={orden.lineas.map((l) => ({
                      nombreProducto: l.nombreProducto,
                      varianteCopia: l.varianteCopia,
                      cantidad: l.cantidad,
                      precioAplicado: l.precioAplicado,
                      esEntonado: Boolean(l.colorSolicitado),
                    }))}
                  />
                </div>
                <EstadoBadge estado={orden.estado} />
              </header>

              <section aria-labelledby="titulo-productos" className="rounded-card bg-neutral-white p-4 shadow-card">
                <h2 id="titulo-productos" className="mb-3 font-title text-base font-bold text-neutral-black">
                  Productos
                </h2>
                <LineasOrdenLista lineas={orden.lineas} />
              </section>

              <section aria-labelledby="titulo-total" className="rounded-card bg-neutral-white p-4 shadow-card">
                <h2 id="titulo-total" className="mb-3 font-title text-base font-bold text-neutral-black">
                  Resumen de pago
                </h2>
                <TotalesOrden
                  subTotal={orden.subTotal}
                  descuento={orden.descuento}
                  costoEntrega={orden.costoEntrega}
                  baseSinImpuesto={orden.baseSinImpuesto}
                  tasaIva={orden.tasaIva}
                  importeIva={orden.importeIva}
                  total={orden.total}
                />
              </section>

              <section aria-labelledby="titulo-historia" className="rounded-card bg-neutral-white p-4 shadow-card">
                <h2 id="titulo-historia" className="mb-3 font-title text-base font-bold text-neutral-black">
                  Seguimiento
                </h2>
                <HistorialEstados pasos={orden.historial.map((h) => ({ estadoNuevo: h.estadoNuevo, fecha: h.fecha }))} />
              </section>
            </>
          )}
        </div>
      </Container>
    </div>
  );
}
