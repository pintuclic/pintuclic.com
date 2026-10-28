'use client';

import { useEffect, useState } from 'react';
import { Bot, MessageCircle } from 'lucide-react';
import { Button } from '@/core/components';
import { obtenerEstadoAsistente, type EstadoAsistente } from '../../services/asistente-api';
import { abrirAsistente } from '../../services/eventos-asistente';

/**
 * La sección «Preguntar al asistente» de /asesoria.
 *
 * Aquí no se dibuja otro chat: se abre el que ya está flotando en todas las páginas. Si
 * hubiera dos implementaciones del chat acabarían separándose, y además la conversación se
 * perdería al pasar de esta pestaña a cualquier otra pantalla.
 */
export function InvitacionAsistente() {
  const [estado, setEstado] = useState<EstadoAsistente | null>(null);

  useEffect(() => {
    let vigente = true;
    obtenerEstadoAsistente()
      .then((e) => {
        if (vigente) setEstado(e);
      })
      .catch(() => {
        if (vigente) setEstado({ disponible: false, motivo: null });
      });
    return () => {
      vigente = false;
    };
  }, []);

  const disponible = estado?.disponible === true;

  return (
    <div className="rounded-card border border-neutral-light bg-neutral-white p-6 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-subaction text-action">
        <Bot className="h-7 w-7" aria-hidden="true" />
      </span>

      <h2 className="mt-4 font-title text-lg font-semibold text-neutral-black">
        Pregúntale al asistente
      </h2>
      <p className="mx-auto mt-2 max-w-md font-sans text-sm text-neutral-medium">
        {disponible
          ? 'Resuelve dudas sobre pintura, preparación de superficies y cómo aplicarla. Para saber cuánta necesitas, usa la calculadora.'
          : 'El asistente no está disponible en este momento. Puedes usar las otras dos herramientas de esta página o escribirle a un asesor.'}
      </p>

      {disponible && (
        <Button
          type="button"
          onClick={() => abrirAsistente()}
          className="mt-5"
          leftIcon={<MessageCircle className="h-4 w-4" />}
        >
          Abrir el asistente
        </Button>
      )}
    </div>
  );
}
