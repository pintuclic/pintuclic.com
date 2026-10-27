import { Suspense } from 'react';
import type { Metadata } from 'next';
import { MisCotizacionesView } from '@/modules/m21-cotizaciones/components/MisCotizacionesView';

export const metadata: Metadata = {
  title: 'Mis cotizaciones · Pintu Clic',
  robots: { index: false, follow: false },
};

/** M21 · Cotizaciones del cliente. `?estado=` filtra la lista. */
export default function MisCotizacionesPage() {
  // `useSearchParams` exige un límite Suspense para poder generar la página.
  return (
    <Suspense fallback={null}>
      <MisCotizacionesView />
    </Suspense>
  );
}
