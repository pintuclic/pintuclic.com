import type { Metadata } from 'next';
import { RetenidasView } from '@/modules/m09-cumplimiento/components/RetenidasView';

export const metadata: Metadata = {
  title: 'Pedidos detenidos — Panel Administrativo — Pintu Clic',
};

/** HU-CUM-03 · Pedidos detenidos por disponibilidad. El permiso `ventas.gestionar` lo exige el servidor. */
export default function PedidosRetenidosPage() {
  return <RetenidasView />;
}
