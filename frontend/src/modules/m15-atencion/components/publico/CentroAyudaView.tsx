'use client';

import { Container } from '@/core/components';
import { BotonContactoDirecto } from './BotonContactoDirecto';
import { FormularioContacto } from './FormularioContacto';
import { HorarioDeAtencion } from './HorarioDeAtencion';
import { PreguntasFrecuentes } from './PreguntasFrecuentes';

/** Centro de ayuda público: preguntas frecuentes, contacto y horario (M15). */
export function CentroAyudaView() {
  return (
    <Container className="py-8 lg:py-12">
      <header className="mb-8 max-w-2xl">
        <h1 className="font-title text-2xl font-bold text-corporate lg:text-3xl">Centro de ayuda</h1>
        <p className="mt-2 font-sans text-sm text-neutral-dark">
          Resuelve las dudas más frecuentes o escríbenos: te respondemos por correo.
        </p>
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-labelledby="titulo-faqs">
          <h2 id="titulo-faqs" className="mb-4 font-title text-xl font-semibold text-neutral-black">
            Preguntas frecuentes
          </h2>
          <PreguntasFrecuentes />

          <section aria-labelledby="titulo-contacto" className="mt-10">
            <h2
              id="titulo-contacto"
              className="mb-4 font-title text-xl font-semibold text-neutral-black"
            >
              ¿No encontraste tu respuesta?
            </h2>
            <FormularioContacto />
          </section>
        </section>

        <aside className="space-y-6">
          <HorarioDeAtencion />

          <div className="rounded-card border border-neutral-light bg-neutral-white p-5">
            <h3 className="mb-2 font-title text-lg font-semibold text-corporate">
              ¿Vas a pintar una obra entera?
            </h3>
            <p className="mb-4 font-sans text-sm text-neutral-dark">
              Escríbele directamente a un asesor y te orientamos antes de armar el pedido.
            </p>
            <BotonContactoDirecto referencia="Escribo desde el centro de ayuda." />
          </div>
        </aside>
      </div>
    </Container>
  );
}
