import type { Metadata } from 'next';
import { MisDevolucionesView } from '@/modules/m11-postventa/components/cliente/MisDevolucionesView';

export const metadata: Metadata = {
  title: 'Mis Devoluciones y Cancelaciones · Pintu Clic',
  robots: { index: false, follow: false },
};

export default function MisDevolucionesPage() {
  return <MisDevolucionesView />;
}
