import type { Metadata } from 'next';
import { BandejaPostventaView } from '@/modules/m11-postventa/components/admin/BandejaPostventaView';

export const metadata: Metadata = {
  title: 'Postventa y Reembolsos · Administración Pintu Clic',
  robots: { index: false, follow: false },
};

export default function PostventaAdminPage() {
  return <BandejaPostventaView />;
}
