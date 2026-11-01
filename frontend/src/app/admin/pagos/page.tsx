import { Suspense } from 'react';
import type { Metadata } from 'next';
import { PagosAdminView } from '@/modules/m07-checkout/components/PagosAdminView';

export const metadata: Metadata = {
  title: 'Pagos — Panel Administrativo — Pintu Clic',
};

/** M07 · Compras pagadas por Wompi (Nequi y la página de pago de Wompi). Filtros y búsqueda en la URL; el permiso lo resuelve el servidor. */
export default function PagosAdminPage() {
  return (
    <Suspense fallback={null}>
      <PagosAdminView />
    </Suspense>
  );
}
