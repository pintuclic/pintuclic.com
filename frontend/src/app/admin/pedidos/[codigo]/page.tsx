import type { Metadata } from 'next';
import { DetallePedidoView } from '@/modules/m08-ordenes/components/admin/DetallePedidoView';

export const metadata: Metadata = {
  title: 'Detalle del pedido — Panel Administrativo — Pintu Clic',
};

/** HU-ORD-09 · Detalle para atender un pedido. */
export default async function DetallePedidoAdminPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  return <DetallePedidoView codigo={codigo} />;
}
