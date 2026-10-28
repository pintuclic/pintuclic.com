import type { Metadata } from 'next';
import { PaginaInstitucionalView } from '@/modules/m16-contenido/components/publico/PaginaInstitucionalView';

export const metadata: Metadata = {
  title: 'Sobre Nosotros — Pintu Clic',
  description: 'Conoce nuestra historia, misión, visión y horarios de atención en Pintu Clic.',
};

export default function SobreNosotrosPage() {
  return <PaginaInstitucionalView slug="sobre-nosotros" />;
}
