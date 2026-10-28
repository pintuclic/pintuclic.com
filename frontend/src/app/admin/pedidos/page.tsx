import type { Metadata } from 'next';
import { BandejaView } from '@/modules/m08-ordenes/components/admin/BandejaView';

export const metadata: Metadata = {
  title: 'Pedidos — Panel Administrativo — Pintu Clic',
};

/** HU-ORD-05 y HU-ORD-08 · Bandeja de pedidos. El permiso `ventas.ver` lo exige el servidor. */
export default function PedidosAdminPage() {
  return <BandejaView />;
}
