'use client';

import { Container } from '@/core/components';
import { BotonContactoDirecto } from './BotonContactoDirecto';
import { FormularioContacto } from './FormularioContacto';
import { HorarioDeAtencion } from './HorarioDeAtencion';

/**
 * Lo que M15 aporta al centro de ayuda: escribirle al equipo, saber cuándo hay
 * alguien atendiendo y hablar con un asesor. Abre la página; las preguntas
 * frecuentes van debajo y son de M16.
 */
export function ContactoYHorarioView() {
  return (
    <Container className="pb-10">
      {/*
        El formulario manda y ocupa el ancho: sin sesión se reduce a un aviso
        corto, así que una columna lateral fija dejaría un hueco. El horario y
        el canal directo van debajo, en dos tarjetas del mismo alto.
      */}
      <section aria-labelledby="titulo-contacto" className="mb-8 max-w-2xl">
        <h2
          id="titulo-contacto"
          className="mb-2 font-title text-xl font-semibold text-neutral-black"
        >
          Escríbenos
        </h2>
        <p className="mb-4 font-sans text-sm text-neutral-dark">
          Cuéntanos qué necesitas y te respondemos al correo de tu cuenta.
        </p>
        <FormularioContacto />
      </section>

      <div className="grid items-start gap-6 sm:grid-cols-2">
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
      </div>
    </Container>
  );
}
