import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ReportesView } from '@/modules/m19-reportes/components/ReportesView';

export const metadata: Metadata = {
  title: 'Reportes — Admin Pintu Clic',
  description: 'Reportes de ventas, clientes y descuentos por semana, mes y año.',
};

export default function AdminReportesPage() {
  // `useSearchParams` exige una frontera de Suspense para el prerenderizado.
  return (
    <Suspense fallback={null}>
      <ReportesView />
    </Suspense>
  );
}
