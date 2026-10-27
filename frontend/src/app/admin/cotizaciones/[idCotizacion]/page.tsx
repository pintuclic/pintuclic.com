import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CotizacionAdminView } from '@/modules/m21-cotizaciones/components/CotizacionAdminView';

export const metadata: Metadata = {
  title: 'Cotización — Panel Administrativo — Pintu Clic',
};

/** M21 · Revisar, ajustar, enviar o rechazar una cotización. */
export default async function CotizacionAdminPage({ params }: { params: Promise<{ idCotizacion: string }> }) {
  const { idCotizacion } = await params;
  const id = Number(idCotizacion);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return <CotizacionAdminView idCotizacion={id} />;
}
