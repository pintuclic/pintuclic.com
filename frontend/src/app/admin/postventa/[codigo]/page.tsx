import type { Metadata } from 'next';
import { DetallePostventaAdminView } from '@/modules/m11-postventa/components/admin/DetallePostventaAdminView';

export const metadata: Metadata = {
  title: 'Gestión de Solicitud · Administración Pintu Clic',
  robots: { index: false, follow: false },
};

export default async function DetallePostventaAdminPage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;
  return <DetallePostventaAdminView codigo={codigo} />;
}
