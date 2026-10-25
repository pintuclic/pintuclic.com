'use client';

import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Alert, Skeleton } from '@/core/components';
import type { PreguntaFrecuentePublica } from '../../interfaces/atencion.interface';
import { listarPreguntasFrecuentes } from '../../services/atencion-api';
import { mensajeDeError } from '../../services/mensaje-error';

/** Conserva el orden que llega del servidor, que ya viene agrupado y ordenado. */
function agruparPorTema(
  preguntas: readonly PreguntaFrecuentePublica[],
): { tema: string; preguntas: PreguntaFrecuentePublica[] }[] {
  const grupos: { tema: string; preguntas: PreguntaFrecuentePublica[] }[] = [];

  for (const pregunta of preguntas) {
    const ultimo = grupos.at(-1);
    if (ultimo !== undefined && ultimo.tema === pregunta.tema) {
      ultimo.preguntas.push(pregunta);
    } else {
      grupos.push({ tema: pregunta.tema, preguntas: [pregunta] });
    }
  }

  return grupos;
}

export function PreguntasFrecuentes() {
  const [preguntas, setPreguntas] = useState<PreguntaFrecuentePublica[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;

    listarPreguntasFrecuentes()
      .then((datos) => {
        if (vigente) setPreguntas(datos);
      })
      .catch((err: unknown) => {
        if (vigente) setError(mensajeDeError(err, 'No pudimos cargar las preguntas frecuentes.'));
      });

    return () => {
      vigente = false;
    };
  }, []);

  if (error !== null) {
    return <Alert variant="error">{error}</Alert>;
  }

  if (preguntas === null) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Cargando preguntas frecuentes">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  if (preguntas.length === 0) {
    return (
      <p className="font-sans text-sm text-neutral-medium">
        Todavía no hay preguntas publicadas. Escríbenos y te respondemos.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {agruparPorTema(preguntas).map((grupo) => (
        <section key={grupo.tema} aria-labelledby={`tema-${grupo.tema}`}>
          <h3
            id={`tema-${grupo.tema}`}
            className="mb-3 font-title text-lg font-semibold text-corporate"
          >
            {grupo.tema}
          </h3>

          <ul className="space-y-2">
            {grupo.preguntas.map((pregunta) => (
              <li key={pregunta.idPregunta}>
                {/* `details` da apertura por teclado y lectura por lector de pantalla sin JS. */}
                <details className="group rounded-card border border-neutral-light bg-neutral-white">
                  <summary className="flex cursor-pointer items-center justify-between gap-3 rounded-card px-4 py-3 font-sans text-sm font-medium text-neutral-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50">
                    {pregunta.pregunta}
                    <ChevronDown
                      className="h-5 w-5 shrink-0 text-neutral-medium transition-transform group-open:rotate-180"
                      aria-hidden="true"
                    />
                  </summary>
                  <p className="whitespace-pre-line border-t border-neutral-light px-4 py-3 font-sans text-sm text-neutral-dark">
                    {pregunta.respuesta}
                  </p>
                </details>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
