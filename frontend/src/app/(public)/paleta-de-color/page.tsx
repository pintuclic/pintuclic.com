import { Suspense } from 'react';
import type { Metadata } from 'next';
import { PaletaColorView } from '@/modules/m01-catalogo/components/paleta/PaletaColorView';

export const metadata: Metadata = {
  title: 'Paleta de color — Pintu Clic',
  description: 'Recorre el abanico de colores, mira qué combina con tu favorito y encuentra los productos que se entregan en ese color.',
};

export default function PaletaDeColorPage() {
  // `useSearchParams` exige un límite Suspense para poder generar la página.
  return (
    <Suspense fallback={null}>
      <PaletaColorView />
    </Suspense>
  );
}
