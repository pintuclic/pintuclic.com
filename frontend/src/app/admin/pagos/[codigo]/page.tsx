import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PagoAdminView } from '@/modules/m07-checkout/components/PagoAdminView';

export const metadata: Metadata = {
  title: 'Compra — Panel Administrativo — Pintu Clic',
};

/** M07 · Detalle de una compra con sus intentos en Wompi y la conciliación (R16). */
export default async function PagoAdminPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  if (!/^SOL-\d{4}-\d{5,}$/.test(codigo)) notFound();
  return <PagoAdminView codigo={codigo} />;
}
