import type { Metadata } from 'next';
import { PaginaInstitucionalView } from '@/modules/m16-contenido/components/publico/PaginaInstitucionalView';

export const metadata: Metadata = {
  title: 'Políticas de Envío y Entregas — Pintu Clic',
  description: 'Modalidades de envío a domicilio, recogida en almacén y tiempos de entrega en Pintu Clic.',
};

export default function PoliticasDeEnvioPage() {
  return <PaginaInstitucionalView slug="politicas-de-envio" />;
}
