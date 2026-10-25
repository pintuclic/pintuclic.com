import type { Metadata } from 'next';
import { ContenidoAdminView } from '@/modules/m16-contenido/components/admin/ContenidoAdminView';

export const metadata: Metadata = {
  title: 'Contenido Institucional y FAQ — Admin Pintu Clic',
  description: 'Administración de páginas institucionales y preguntas frecuentes del Centro de Ayuda.',
};

export default function AdminContenidoPage() {
  return <ContenidoAdminView />;
}
