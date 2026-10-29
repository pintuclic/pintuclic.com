import type { Metadata } from 'next';
import { HojaPreparacionView } from '@/modules/m09-cumplimiento/components/HojaPreparacionView';

export const metadata: Metadata = { title: 'Hoja de preparación — Admin Pintu Clic' };

export default async function HojaPreparacionPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  return <HojaPreparacionView codigoOrden={codigo} volverA={`/admin/pedidos/${encodeURIComponent(codigo)}`} />;
}
