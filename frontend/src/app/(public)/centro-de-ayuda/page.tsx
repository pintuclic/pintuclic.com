import type { Metadata } from 'next';
import { CentroAyudaView } from '@/modules/m15-atencion/components/publico/CentroAyudaView';

export const metadata: Metadata = {
  title: 'Centro de ayuda — Pintu Clic',
  description:
    'Preguntas frecuentes sobre pedidos, envíos, garantías y color, horario de atención y contacto directo con un asesor.',
};

export default function CentroDeAyudaPage() {
  return <CentroAyudaView />;
}
