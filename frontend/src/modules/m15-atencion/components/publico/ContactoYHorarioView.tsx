'use client';

import { Container } from '@/core/components';
import { BotonContactoDirecto } from './BotonContactoDirecto';
import { FormularioContacto } from './FormularioContacto';
import { HorarioDeAtencion } from './HorarioDeAtencion';

/**
 * Canales de atención al cliente (M15) en el centro de ayuda: formulario de
 * contacto a la izquierda (8 columnas) y horario + WhatsApp a la derecha
 * (4 columnas), alineados con la cuadrícula de preguntas frecuentes.
 */
export function ContactoYHorarioView() {
  return (
    <section
      id="contacto-equipo"
      aria-labelledby="titulo-contacto"
      className="scroll-mt-24 pb-4"
    >
      <Container>
        <div className="grid grid-cols-1 gap-8 items-start lg:grid-cols-12">
          <div className="lg:col-span-8 rounded-card border border-neutral-light bg-neutral-white p-6 shadow-card sm:p-8">
            <h2
              id="titulo-contacto"
              className="mb-2 font-title text-xl font-bold text-corporate sm:text-2xl"
            >
              Escríbenos
            </h2>
            <p className="mb-5 font-sans text-sm text-neutral-medium sm:text-base">
              Cuéntanos qué necesitas y te respondemos al correo de tu cuenta.
            </p>
            <FormularioContacto />
          </div>

          <aside
            aria-label="Horario de atención y contacto por WhatsApp"
            className="lg:col-span-4 space-y-6"
          >
            <HorarioDeAtencion />

            <div className="rounded-card border border-neutral-light bg-neutral-white p-6 shadow-card">
              <h3 className="mb-2 font-title text-base font-semibold text-corporate">
                ¿Vas a pintar una obra entera?
              </h3>
              <p className="mb-4 font-sans text-sm text-neutral-dark">
                Escríbele directamente a un asesor y te orientamos antes de armar el pedido.
              </p>
              <BotonContactoDirecto
                referencia="Escribo desde el centro de ayuda."
                mostrarAvisoNoDisponible
              />
            </div>
          </aside>
        </div>
      </Container>
    </section>
  );
}