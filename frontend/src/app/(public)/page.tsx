import type { Metadata } from 'next';
import { Container } from '@/core/components';
import { CategoryExplorer } from './_components/CategoryExplorer';
import { EmpresaCta } from './_components/EmpresaCta';
import { FeaturedProducts } from './_components/FeaturedProducts';
import { HeroSection } from './_components/HeroSection';
import { MasVendidos } from './_components/MasVendidos';
import { OtrosProductos } from './_components/OtrosProductos';
import { EspacioPublicitario } from '@/modules/m14-patrocinios/components/EspacioPublicitario';
import { ProductosPatrocinados } from '@/modules/m14-patrocinios/components/ProductosPatrocinados';
import { ToolsBar } from './_components/ToolsBar';
import { TrustStrip } from './_components/TrustStrip';

export const metadata: Metadata = {
  title: 'Pintu Clic | Todo para tu proyecto, en un solo lugar',
  description:
    'Pinturas, herramientas y accesorios de las mejores marcas. Calidad, asesoría y envío rápido a toda Colombia.',
};

/**
 * Página de inicio (UI Spec §4.1). El banner llega de borde a borde; luego, en la columna del sitio, la franja de
 * confianza y los destacados (blanco); una banda azul con olas con los más vendidos; y de nuevo blanco con herramientas
 * y más. Frente propio FP-01: los datos de respaldo son estáticos.
 */
export default function HomePage() {
  return (
    <>
      <HeroSection />
      <Container className="flex flex-col gap-5 pb-8 pt-4 lg:gap-6">
        <TrustStrip />
        {/* Espacio publicitario (M14 · B1): no se pinta si no hay anuncios vigentes */}
        <EspacioPublicitario espacio="inicio" />
        <EmpresaCta />
        <ToolsBar />
        <FeaturedProducts />
      </Container>
      <MasVendidos />
      <Container className="flex flex-col gap-8 pb-10 pt-6 lg:gap-10">
        <OtrosProductos />
        <ProductosPatrocinados />
        <CategoryExplorer />
      </Container>
    </>
  );
}
