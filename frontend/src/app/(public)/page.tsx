import type { Metadata } from 'next';
import { Container } from '@/core/components';
import { CategoryExplorer } from './_components/CategoryExplorer';
import { EmpresaCta } from './_components/EmpresaCta';
import { FeaturedProducts } from './_components/FeaturedProducts';
import { HeroSection } from './_components/HeroSection';
import { ToolsBar } from './_components/ToolsBar';
import { TrustStrip } from './_components/TrustStrip';

export const metadata: Metadata = {
  title: 'Pintu Clic | Todo para tu proyecto, en un solo lugar',
  description:
    'Pinturas, herramientas y accesorios de las mejores marcas. Calidad, asesoría y envío rápido a toda Colombia.',
};

/** Página de inicio (UI Spec §4.1). Frente propio FP-01: datos estáticos temporales. */
export default function HomePage() {
  return (
    <Container className="flex flex-col gap-8 py-6 lg:gap-10">
      <HeroSection />
      <TrustStrip />
      <EmpresaCta />
      <ToolsBar />
      <FeaturedProducts />
      <CategoryExplorer />
    </Container>
  );
}
