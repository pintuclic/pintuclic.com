import type { Metadata } from 'next';
import { MisPedidosView } from '@/modules/m08-ordenes/components/cliente/MisPedidosView';

export const metadata: Metadata = {
  title: 'Mis pedidos · Pintu Clic',
  robots: { index: false, follow: false },
};

/** HU-ORD-07 · Sección de pedidos del cliente. Ruta protegida por el prefijo `/perfil` del middleware. */
export default function MisPedidosPage() {
  return <MisPedidosView />;
}
