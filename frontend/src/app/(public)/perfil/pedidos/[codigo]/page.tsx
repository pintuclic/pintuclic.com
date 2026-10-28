import type { Metadata } from 'next';
import { PedidoDetalleClienteView } from '@/modules/m08-ordenes/components/cliente/PedidoDetalleClienteView';

export const metadata: Metadata = {
  title: 'Detalle del pedido · Pintu Clic',
  robots: { index: false, follow: false },
};

/** HU-ORD-04 · Detalle de un pedido. El servidor decide si es del titular; una ajena responde 404. */
export default async function PedidoDetallePage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  return <PedidoDetalleClienteView codigo={codigo} />;
}
