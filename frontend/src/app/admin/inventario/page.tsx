import { Suspense } from 'react';
import type { Metadata } from 'next';
import { InventarioView } from '@/modules/m13-inventario/components/InventarioView';

export const metadata: Metadata = {
  title: 'Inventario — Panel Administrativo — Pintu Clic',
};

export default function InventarioAdminPage() {
  // `useSearchParams` exige un límite Suspense.
  return (
    <Suspense fallback={null}>
      <InventarioView />
    </Suspense>
  );
}
