'use client';

import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Skeleton } from '@/core/components';
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
  /**
   * En tarjetas dedicadas (como el centro de ayuda) muestra un aviso si el canal
   * no está disponible temporalmente, para no dejar una tarjeta vacía.
   */
  mostrarAvisoNoDisponible?: boolean;
}

/**
 * Botón de contacto directo por WhatsApp (HU-ATC-03). Es un enlace saliente: el
 * sistema no recibe, almacena ni responde conversaciones (RF-ATC-03-04).
 */
export function BotonContactoDirecto({
  referencia,
  className = '',
  mostrarAvisoNoDisponible = false,
}: BotonContactoDirectoProps) {
  const [canal, setCanal] = useState<CanalWhatsappPublico | null>(null);
  const [horario, setHorario] = useState<HorarioAtencion | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vigente = true;
    setCargando(true);

    Promise.all([
      obtenerCanal().catch(() => null),
      obtenerHorario().catch(() => null),
    ])
      .then(([canalActual, horarioActual]) => {
        if (!vigente) return;
        setCanal(canalActual);
        setHorario(horarioActual);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, []);

  if (cargando) {
    return mostrarAvisoNoDisponible ? (
      <Skeleton className="h-11 w-full rounded-btn" aria-label="Cargando canal de WhatsApp" />
    ) : null;
  }

  if (canal === null) {
    if (!mostrarAvisoNoDisponible) {
      return null;
    }
    return (
      <p className="rounded-btn border border-neutral-light bg-neutral-lightest px-3 py-2.5 font-sans text-xs text-neutral-medium">
        El enlace directo de WhatsApp no está disponible en este momento. Puedes dejarnos tu mensaje en el formulario de contacto.
      </p>
    );
  }

  const fueraDeHorario = horario !== null && !horario.abiertoAhora;

  return (
    <div className={`space-y-2 ${className}`}>
      <a
        href={enlaceDelCanal(canal, referencia)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center gap-2 rounded-btn bg-conversion px-4 py-2 font-title text-sm font-semibold text-neutral-white transition-colors hover:bg-conversion-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-conversion/50"
      >
        <MessageCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
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