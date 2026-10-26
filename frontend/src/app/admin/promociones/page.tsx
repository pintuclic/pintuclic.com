import { Suspense } from 'react';
import type { Metadata } from 'next';
import { PromocionesView } from '@/modules/m06-precios/components/PromocionesView';

export const metadata: Metadata = {
  title: 'Promociones — Panel Administrativo — Pintu Clic',
};

export default function PromocionesAdminPage() {
  // `useSearchParams` exige un límite Suspense.
  return (
    <Suspense fallback={null}>
      <PromocionesView />
    </Suspense>
  );
}
