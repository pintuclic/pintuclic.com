import { Suspense } from 'react';
import type { Metadata } from 'next';
import { CatalogoPublicoView } from '@/modules/m01-catalogo/components/publico/CatalogoPublicoView';

export const metadata: Metadata = {
  title: 'Ofertas — Pintu Clic',
  description: 'Productos con descuento ahora mismo y las promociones que están activas.',
};

export default function OfertasPage() {
  // `useSearchParams` exige un límite Suspense para poder generar la página.
  return (
    <Suspense fallback={null}>
      <CatalogoPublicoView soloOfertas />
    </Suspense>
  );
}
