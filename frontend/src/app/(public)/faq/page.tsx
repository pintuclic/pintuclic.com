import type { Metadata } from 'next';
import { CentroAyudaFaqView } from '@/modules/m16-contenido/components/publico/CentroAyudaFaqView';

export const metadata: Metadata = {
  title: 'Preguntas Frecuentes (FAQ) — Pintu Clic',
  description: 'Preguntas frecuentes sobre envíos, productos y cuentas empresariales en Pintu Clic.',
};

export default function FaqPage() {
  return <CentroAyudaFaqView />;
}
