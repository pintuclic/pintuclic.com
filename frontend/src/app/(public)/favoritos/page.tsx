import type { Metadata } from 'next';
import { FavoritosView } from '../_components/FavoritosView';

export const metadata: Metadata = {
  title: 'Mis favoritos | Pintu Clic',
  description: 'Los productos que guardaste con la estrella.',
  robots: { index: false },
};

export default function FavoritosPage() {
  return <FavoritosView />;
}
