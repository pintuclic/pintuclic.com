import type { Metadata } from 'next';
import { AdminPageHeader } from '@/core/components';
import { DatosFacturacionForm } from '@/modules/m12-facturacion/components/DatosFacturacionForm';

export const metadata: Metadata = {
  title: 'Facturación — Admin Pintu Clic',
  description: 'Datos del vendedor que salen en los comprobantes de venta.',
};

export default function AdminFacturacionPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader title="Facturación" subtitle="Los datos de la empresa que salen en el comprobante de venta de cada pedido." />
      <div className="rounded-card border border-neutral-light bg-neutral-white p-6 shadow-card">
        <DatosFacturacionForm />
      </div>
    </div>
  );
}
