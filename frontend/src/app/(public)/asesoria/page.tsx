import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Container } from '@/core/components';
import { CalculadoraGeneralView } from '@/modules/m03-asesoria/components/publico/CalculadoraGeneralView';

export const metadata: Metadata = {
  title: 'Calculadora de pintura — Pintu Clic',
  description:
    'Calcula cuánta pintura necesitas para tu proyecto según los metros cuadrados y las manos que vas a dar, o averigua cuánto rinde la pintura que ya tienes.',
};

/**
 * Calculadora general de M03 (HU-ASE-02). Según el contrato (Q7) también se monta en la
 * landing y, la de producto, en la ficha de M01; esta página existe para poder usarla y
 * compartirla por su propio enlace mientras eso se acuerda con los dueños de esas pantallas.
 */
export default function AsesoriaPage() {
  return (
    <div className="bg-neutral-lightest py-8 sm:py-12 space-y-8">
      <Container>
        <nav
          aria-label="Ruta de navegación"
          className="flex items-center gap-2 font-sans text-xs text-neutral-medium sm:text-sm"
        >
          <Link
            href="/"
            className="rounded-xs transition-colors hover:text-action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50"
          >
            Inicio
          </Link>
          <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="font-medium text-neutral-dark">Calculadora de pintura</span>
        </nav>
      </Container>

      <CalculadoraGeneralView />
    </div>
  );
}
