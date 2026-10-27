import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductoFichaView } from '@/modules/m01-catalogo/components/publico/ProductoFichaView';

export const metadata: Metadata = {
  title: 'Producto — Pintu Clic',
};

export default async function ProductoPage({
  params,
  searchParams,
}: {
  params: Promise<{ idProducto: string }>;
  searchParams: Promise<{ color?: string }>;
}) {
  const { idProducto } = await params;
  const { color } = await searchParams;
  if (!/^\d+$/.test(idProducto) || Number(idProducto) < 1) notFound();
  // Paleta de color (M01 · P11): llegar con `?color=<id>` deja ese color ya elegido, si el producto lo ofrece.
  const idColorInicial = color !== undefined && /^\d+$/.test(color) && Number(color) > 0 ? Number(color) : null;
  return <ProductoFichaView idProducto={Number(idProducto)} idColorInicial={idColorInicial} />;
}
