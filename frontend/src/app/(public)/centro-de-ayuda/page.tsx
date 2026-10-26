import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Container } from '@/core/components';
import { CentroAyudaFaqView } from '@/modules/m16-contenido/components/publico/CentroAyudaFaqView';
import { ContactoYHorarioView } from '@/modules/m15-atencion/components/publico/ContactoYHorarioView';

export const metadata: Metadata = {
  title: 'Centro de Ayuda y Preguntas Frecuentes — Pintu Clic',
  description:
    'Resuelve tus dudas frecuentes sobre compras, colores entonados, envíos y cuentas empresariales, o escríbenos y habla con un asesor por WhatsApp en Pintu Clic.',
};

/**
 * Única página de ayuda del sitio: `/faq` redirige aquí.
 * Presenta primero las preguntas frecuentes y páginas institucionales (M16) y
 * enseguida los canales de contacto directo, horario y formulario (M15) en un
 * diseño de dos columnas que aprovecha todo el ancho disponible.
 */
export default function CentroDeAyudaPage() {
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
          <span className="font-medium text-neutral-dark">Centro de ayuda</span>
        </nav>
      </Container>

      <CentroAyudaFaqView />
      <ContactoYHorarioView />
    </div>
  );
}