import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Container } from '@/core/components';
import { AsesoriaView } from '@/modules/m03-asesoria/components/publico/AsesoriaView';

export const metadata: Metadata = {
  title: 'Asesoría: qué pintura necesitas y cuánta — Pintu Clic',
  description:
    'Responde unas pocas preguntas y te mostramos las pinturas adecuadas para tu proyecto, o calcula cuánta pintura necesitas según los metros cuadrados y las manos que vas a dar.',
};

/**
 * Asesoría de M03: la búsqueda asistida (HU-ASE-01) y la calculadora general (HU-ASE-02).
 *
 * Según el contrato (Q7) la calculadora también se monta en la ficha de M01 y en la landing;
 * esta página existe para poder usarlas y compartirlas por su propio enlace mientras eso se
 * acuerda con los dueños de esas pantallas.
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
          <span className="font-medium text-neutral-dark">Asesoría</span>
        </nav>
      </Container>

      <AsesoriaView />
    </div>
  );
}
