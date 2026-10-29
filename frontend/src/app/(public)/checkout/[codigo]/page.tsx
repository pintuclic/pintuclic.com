import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PagoEstadoView } from '@/modules/m07-checkout/components/PagoEstadoView';

export const metadata: Metadata = {
  title: 'Tu compra · Pintu Clic',
  robots: { index: false, follow: false },
};

/** M07 · Espera y resultado del pago de una compra del cliente (R1: el servidor solo entrega las suyas). */
export default async function PagoPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  if (!/^SOL-\d{4}-\d{5,}$/.test(codigo)) notFound();
  return <PagoEstadoView codigo={codigo} />;
}
