import type { Metadata } from 'next';
import { ComprobanteView } from '@/modules/m12-facturacion/components/ComprobanteView';

export const metadata: Metadata = { title: 'Comprobante del pedido — Admin Pintu Clic' };

export default async function ComprobanteAdminPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  return <ComprobanteView codigoOrden={codigo} modo="personal" volverA={`/admin/pedidos/${encodeURIComponent(codigo)}`} esAdmin />;
}
