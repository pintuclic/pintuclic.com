import { Suspense } from 'react';
import type { Metadata } from 'next';
import { CotizacionesAdminView } from '@/modules/m21-cotizaciones/components/CotizacionesAdminView';

export const metadata: Metadata = {
  title: 'Cotizaciones — Panel Administrativo — Pintu Clic',
};

/** M21 · Bandeja de cotizaciones. Filtros y búsqueda en la URL; el permiso lo resuelve el servidor. */
export default function CotizacionesAdminPage() {
  return (
    <Suspense fallback={null}>
      <CotizacionesAdminView />
    </Suspense>
  );
}
