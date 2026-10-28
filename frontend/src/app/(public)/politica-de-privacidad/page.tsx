import type { Metadata } from 'next';
import { PaginaInstitucionalView } from '@/modules/m16-contenido/components/publico/PaginaInstitucionalView';

export const metadata: Metadata = {
  title: 'Política de Privacidad y Tratamiento de Datos — Pintu Clic',
  description: 'Política de privacidad y tratamiento de datos personales conforme a la Ley 1581 de 2012.',
};

export default function PoliticaDePrivacidadPage() {
  return <PaginaInstitucionalView slug="politica-de-privacidad" />;
}
