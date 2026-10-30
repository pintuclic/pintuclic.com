'use client';

import { EnvioCliente } from '@/modules/m10-entrega/components/EnvioCliente';
import { PedidoDetalleClienteView } from '@/modules/m08-ordenes/components/cliente/PedidoDetalleClienteView';

/**
 * Frontera de cliente propia de la ruta (mismo motivo que `DetallePedidoAdmin`): el detalle del pedido de M08 y,
 * debajo, el seguimiento del envío de M10, que solo aparece si el pedido tiene envío.
 */
export function PedidoDetalle({ codigo }: { codigo: string }) {
  return (
    <>
      <PedidoDetalleClienteView codigo={codigo} />
      <EnvioCliente codigo={codigo} />
    </>
  );
}
