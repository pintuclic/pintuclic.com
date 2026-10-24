import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductoFichaView } from '@/modules/m01-catalogo/components/publico/ProductoFichaView';

export const metadata: Metadata = {
  title: 'Producto — Pintu Clic',
};

export default async function ProductoPage({ params }: { params: Promise<{ idProducto: string }> }) {
  const { idProducto } = await params;
  if (!/^\d+$/.test(idProducto) || Number(idProducto) < 1) notFound();
  return <ProductoFichaView idProducto={Number(idProducto)} />;
}
