import type { Metadata } from 'next';
import { DetalleSolicitudClienteView } from '@/modules/m11-postventa/components/cliente/DetalleSolicitudClienteView';

export const metadata: Metadata = {
  title: 'Detalle de Solicitud · Pintu Clic',
  robots: { index: false, follow: false },
};

export default async function DetalleSolicitudPage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;
  return <DetalleSolicitudClienteView codigo={codigo} />;
}
