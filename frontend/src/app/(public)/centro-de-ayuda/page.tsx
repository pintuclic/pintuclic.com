import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Container } from '@/core/components';
import { CentroAyudaFaqView } from '@/modules/m16-contenido/components/publico/CentroAyudaFaqView';
import { ContactoYHorarioView } from '@/modules/m15-atencion/components/publico/ContactoYHorarioView';

export const metadata: Metadata = {
  title: 'Centro de Ayuda y Preguntas Frecuentes — Pintu Clic',
  description:
    'Escríbenos, consulta el horario de atención y habla con un asesor por WhatsApp. Además, las respuestas a las preguntas frecuentes sobre compras, colores entonados, envíos y cuentas empresa en Pintu Clic.',
};

/**
 * Única página de ayuda del sitio: `/faq` redirige aquí. La abre el contacto con
 * el equipo (M15) y debajo van las preguntas frecuentes (M16), que son suyas.
 * La ruta y el título de la página se ponen aquí porque los comparten los dos.
 */
export default function CentroDeAyudaPage() {
  return (
    <div className="bg-neutral-lightest py-8 sm:py-12">
      <Container>
        <nav
          aria-label="Ruta de navegación"
          className="mb-6 flex items-center gap-2 font-sans text-xs text-neutral-medium sm:text-sm"
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

        <div className="mb-8 max-w-2xl">
          <h1 className="font-title text-2xl font-bold tracking-tight text-corporate sm:text-3xl">
            Centro de ayuda
          </h1>
          <p className="mt-2 font-sans text-sm text-neutral-medium sm:text-base">
            Escríbenos y te respondemos al correo de tu cuenta, o habla con un asesor por WhatsApp.
          </p>
          {/* Atajo a la sección de M16, que vive al final de la página. */}
          <a
            href="#preguntas-frecuentes"
            className="mt-4 inline-flex min-h-[44px] items-center rounded-btn border border-action px-4 py-2 font-title text-sm font-semibold text-action transition-colors hover:bg-subaction focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50"
          >
            Ver preguntas frecuentes
          </a>
        </div>
      </Container>

      <ContactoYHorarioView />
      <CentroAyudaFaqView />
    </div>
  );
}
