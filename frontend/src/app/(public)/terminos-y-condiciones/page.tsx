import type { Metadata } from 'next';
import { PaginaInstitucionalView } from '@/modules/m16-contenido/components/publico/PaginaInstitucionalView';

export const metadata: Metadata = {
  title: 'Términos y Condiciones — Pintu Clic',
  description: 'Condiciones legales de uso, compras y pedidos en Pintu Clic.',
};

export default function TerminosYCondicionesPage() {
  return <PaginaInstitucionalView slug="terminos-y-condiciones" />;
}
