import type { Metadata } from 'next';
import { CentroAyudaFaqView } from '@/modules/m16-contenido/components/publico/CentroAyudaFaqView';

export const metadata: Metadata = {
  title: 'Centro de Ayuda y Preguntas Frecuentes — Pintu Clic',
  description: 'Respuestas a las preguntas frecuentes sobre compras, colores entonados, envíos y cuentas empresa en Pintu Clic.',
};

export default function CentroDeAyudaPage() {
  return <CentroAyudaFaqView />;
}
