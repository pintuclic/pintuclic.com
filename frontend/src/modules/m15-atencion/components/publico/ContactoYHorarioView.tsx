'use client';

import { Container } from '@/core/components';
import { BotonContactoDirecto } from './BotonContactoDirecto';
import { FormularioContacto } from './FormularioContacto';
import { HorarioDeAtencion } from './HorarioDeAtencion';

/**
 * Lo que M15 aporta al centro de ayuda: escribirle al equipo, saber cuándo hay
 * alguien atendiendo y hablar con un asesor. Las preguntas frecuentes van
 * arriba y son de M16.
 */
export function ContactoYHorarioView() {
  return (
    <Container className="pb-12">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-labelledby="titulo-contacto">
          <h2
            id="titulo-contacto"
            className="mb-2 font-title text-xl font-semibold text-neutral-black"
          >
            ¿No encontraste tu respuesta?
          </h2>
          <p className="mb-4 font-sans text-sm text-neutral-dark">
            Escríbenos y te respondemos al correo de tu cuenta.
          </p>
          <FormularioContacto />
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
