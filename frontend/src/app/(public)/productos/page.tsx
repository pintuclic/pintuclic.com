import { Suspense } from 'react';
import type { Metadata } from 'next';
import { BusquedaCatalogoView } from '@/modules/m02-busqueda/components/BusquedaCatalogoView';

export const metadata: Metadata = {
  title: 'Catálogo de productos — Pintu Clic',
  description: 'Pinturas, recubrimientos y accesorios para su proyecto, con colores y presentaciones.',
};

export default function ProductosPage() {
  // `useSearchParams` exige un límite Suspense para poder generar la página.
  return (
    <Suspense fallback={null}>
      <BusquedaCatalogoView />
    </Suspense>
  );
}
