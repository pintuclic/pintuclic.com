import type { Metadata } from 'next';
import { BannersAdminView } from '@/core/landing/BannersAdminView';

export const metadata: Metadata = {
  title: 'Banners de Inicio | Pintu Clic Admin',
  description: 'Gestión de sliders e imágenes del carrusel principal de la página de inicio.',
};

export default function AdminBannersPage() {
  return <BannersAdminView />;
}
