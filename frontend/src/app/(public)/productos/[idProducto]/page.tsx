import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductoFichaView } from '@/modules/m01-catalogo/components/publico/ProductoFichaView';
import { colorDeLaDireccion } from '@/modules/m01-catalogo/services/seleccion-ficha';

export const metadata: Metadata = {
  title: 'Producto — Pintu Clic',
};

export default async function ProductoPage({
  params,
  searchParams,
}: {
  params: Promise<{ idProducto: string }>;
  searchParams: Promise<{ color?: string | string[] }>;
}) {
  const { idProducto } = await params;
  if (!/^\d+$/.test(idProducto) || Number(idProducto) < 1) notFound();
  // U8: la ficha abre en el color de la tarjeta (`?color=`); uno inválido se ignora.
  const { color } = await searchParams;
  return <ProductoFichaView idProducto={Number(idProducto)} idColorInicial={colorDeLaDireccion(color)} />;
}
