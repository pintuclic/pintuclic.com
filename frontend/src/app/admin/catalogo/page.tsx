import { Suspense } from 'react';
import type { Metadata } from 'next';
import { CatalogoAdminView } from '@/modules/m01-catalogo/components/admin/CatalogoAdminView';

export const metadata: Metadata = {
  title: 'Catálogo — Panel Administrativo — Pintu Clic',
};

export default function CatalogoAdminPage() {
  // `useSearchParams` exige un límite Suspense.
  return (
    <Suspense fallback={null}>
      <CatalogoAdminView />
    </Suspense>
  );
}
