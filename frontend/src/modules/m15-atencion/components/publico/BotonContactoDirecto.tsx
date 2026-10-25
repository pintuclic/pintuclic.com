'use client';

import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import type { CanalWhatsappPublico, HorarioAtencion } from '../../interfaces/atencion.interface';
import { obtenerCanal, obtenerHorario } from '../../services/atencion-api';
import { enlaceDelCanal } from '../../services/enlace-canal';

export interface BotonContactoDirectoProps {
  /**
   * Producto o carrito desde el que se abre la conversación, para que el asesor
   * sepa de qué le hablan. Solo viaja cuando el destino es un número: un canal
   * de difusión no admite texto prellenado.
   */
  referencia?: string;
  className?: string;
}

/**
 * Botón de contacto directo por WhatsApp (HU-ATC-03). Es un enlace saliente: el
 * sistema no recibe, almacena ni responde conversaciones (RF-ATC-03-04).
 */
export function BotonContactoDirecto({ referencia, className = '' }: BotonContactoDirectoProps) {
  const [canal, setCanal] = useState<CanalWhatsappPublico | null>(null);
  const [horario, setHorario] = useState<HorarioAtencion | null>(null);

  useEffect(() => {
    let vigente = true;

    Promise.all([obtenerCanal(), obtenerHorario()])
      .then(([canalActual, horarioActual]) => {
        if (!vigente) return;
        setCanal(canalActual);
        setHorario(horarioActual);
      })
      .catch(() => {
        // Sin canal configurado no se muestra el botón: nada que ofrecer.
      });

    return () => {
      vigente = false;
    };
  }, []);

  if (canal === null) {
    return null;
  }

  const fueraDeHorario = horario !== null && !horario.abiertoAhora;

  return (
    <div className={`space-y-2 ${className}`}>
      <a
        href={enlaceDelCanal(canal, referencia)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-[44px] items-center gap-2 rounded-btn bg-conversion px-4 py-2 font-title text-sm font-semibold text-neutral-white transition-colors hover:bg-conversion-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-conversion/50"
      >
        <MessageCircle className="h-5 w-5" aria-hidden="true" />
        Hablar con un asesor por WhatsApp
      </a>

      {/* CA-ATC-03-05: fuera del horario se advierte que la respuesta puede demorarse. */}
      {fueraDeHorario && (
        <p className="font-sans text-xs text-neutral-medium">
          Estamos fuera del horario de atención, así que la respuesta puede demorarse.
        </p>
      )}
    </div>
  );
}
