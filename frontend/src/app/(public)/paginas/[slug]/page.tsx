import type { Metadata } from 'next';
import { PaginaInstitucionalView } from '@/modules/m16-contenido/components/publico/PaginaInstitucionalView';

export const metadata: Metadata = {
  title: 'Información Institucional — Pintu Clic',
  description: 'Conoce las políticas, términos y contenido institucional de Pintu Clic.',
};

export default async function PaginaInstitucionalPorSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <PaginaInstitucionalView slug={slug} />;
}
