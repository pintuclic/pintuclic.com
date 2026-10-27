import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CotizacionClienteView } from '@/modules/m21-cotizaciones/components/CotizacionClienteView';

export const metadata: Metadata = {
  title: 'Cotización · Pintu Clic',
  robots: { index: false, follow: false },
};

/** M21 · Detalle de una cotización del cliente (R1: el servidor solo entrega las suyas). */
export default async function CotizacionPage({ params }: { params: Promise<{ idCotizacion: string }> }) {
  const { idCotizacion } = await params;
  const id = Number(idCotizacion);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return <CotizacionClienteView idCotizacion={id} />;
}
