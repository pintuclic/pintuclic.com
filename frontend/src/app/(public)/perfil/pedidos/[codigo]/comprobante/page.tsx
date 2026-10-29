import type { Metadata } from 'next';
import { ComprobanteView } from '@/modules/m12-facturacion/components/ComprobanteView';

export const metadata: Metadata = {
  title: 'Comprobante de compra · Pintu Clic',
  robots: { index: false, follow: false },
};

/** Comprobante de venta de un pedido propio, para ver, imprimir o guardar como PDF. */
export default async function ComprobanteClientePage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  return <ComprobanteView codigoOrden={codigo} modo="cliente" volverA={`/perfil/pedidos/${encodeURIComponent(codigo)}`} />;
}
