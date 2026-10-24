import { Suspense } from 'react';
import type { Metadata } from 'next';
import { CatalogoPublicoView } from '@/modules/m01-catalogo/components/publico/CatalogoPublicoView';

export const metadata: Metadata = {
  title: 'Catálogo de productos — Pintu Clic',
  description: 'Pinturas, recubrimientos y accesorios para su proyecto, con colores y presentaciones.',
};

export default function ProductosPage() {
  // `useSearchParams` exige un límite Suspense para poder generar la página.
  return (
    <Suspense fallback={null}>
      <CatalogoPublicoView />
    </Suspense>
  );
}
