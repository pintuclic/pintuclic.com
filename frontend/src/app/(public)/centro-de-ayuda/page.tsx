import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, CircleHelp, MessageSquare } from 'lucide-react';
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
    <div className="bg-neutral-lightest py-8 sm:py-12 space-y-10">
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

        <div className="rounded-card border border-neutral-light bg-neutral-white p-6 shadow-card sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <h1 className="font-title text-2xl font-bold tracking-tight text-corporate sm:text-3xl">
                Centro de ayuda y preguntas frecuentes
              </h1>
              <p className="mt-2 font-sans text-sm text-neutral-medium sm:text-base">
                Consulta respuestas rápidas sobre pedidos, modalidades de entrega, colores entonados y cuentas empresariales, o comunícate con nuestro equipo.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <a
                href="#preguntas-frecuentes"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-btn border border-neutral-light bg-neutral-lightest px-4 py-2 font-title text-sm font-semibold text-corporate transition-colors hover:bg-subaction focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50"
              >
                <CircleHelp className="h-4 w-4 text-action" aria-hidden="true" />
                Preguntas frecuentes
              </a>
              <a
                href="#contacto-equipo"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-btn bg-action px-4 py-2 font-title text-sm font-semibold text-neutral-white transition-colors hover:bg-action-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50"
              >
                <MessageSquare className="h-4 w-4" aria-hidden="true" />
                Escribir al equipo
              </a>
            </div>
          </div>
        </div>
      </Container>

      <CentroAyudaFaqView />
      <ContactoYHorarioView />
    </div>
  );
}