'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { Badge, Skeleton } from '@/core/components';
import { DIAS_SEMANA } from '../../dtos/m15-atencion.dto';
import type { HorarioAtencion } from '../../interfaces/atencion.interface';
import { obtenerHorario } from '../../services/atencion-api';

const ETIQUETA_DIA = new Map(DIAS_SEMANA.map(({ valor, etiqueta }) => [valor, etiqueta]));

/** Horario vigente de atención humana, con el estado de ahora (HU-ATC-04). */
export function HorarioDeAtencion() {
  const [horario, setHorario] = useState<HorarioAtencion | null>(null);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    let vigente = true;

    obtenerHorario()
      .then((datos) => {
        if (vigente) setHorario(datos);
      })
      .catch(() => {
        if (vigente) setFallo(true);
      });

    return () => {
      vigente = false;
    };
  }, []);

  if (!fallo && horario === null) {
    return <Skeleton className="h-56 w-full rounded-card" aria-label="Cargando el horario de atención" />;
  }

  if (fallo || horario === null) {
    return (
      <div className="rounded-card border border-neutral-light bg-neutral-white p-6 shadow-card">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-title text-base font-semibold text-corporate">
            <Clock className="h-4 w-4 text-action" aria-hidden="true" />
            Horario de atención
          </h3>
          <Badge variant="neutral">Por confirmar</Badge>
        </div>
        <p className="font-sans text-sm text-neutral-dark">
          No pudimos consultar el horario en este instante. Puedes enviarnos tu solicitud en cualquier momento y te responderemos en jornada hábil.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-card border border-neutral-light bg-neutral-white p-6 shadow-card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-title text-base font-semibold text-corporate">
          <Clock className="h-4 w-4 text-action" aria-hidden="true" />
          Horario de atención
        </h3>
        <Badge variant={horario.abiertoAhora ? 'success' : 'neutral'}>
          {horario.abiertoAhora ? 'Atendiendo ahora' : 'Fuera de horario'}
        </Badge>
      </div>

      <dl className="space-y-1.5">
        {horario.franjas.map((franja) => (
          <div key={franja.diaSemana} className="flex items-baseline justify-between gap-4">
            <dt className="font-sans text-sm text-neutral-dark">
              {ETIQUETA_DIA.get(franja.diaSemana) ?? franja.diaSemana}
            </dt>
            <dd className="font-sans text-sm font-medium text-neutral-black">
              {franja.abierto && franja.horaInicio !== null && franja.horaFin !== null
                ? `${franja.horaInicio} a ${franja.horaFin}`
                : 'Cerrado'}
            </dd>
          </div>
        ))}
      </dl>

      {!horario.abiertoAhora && (
        <p className="mt-4 font-sans text-xs text-neutral-medium">
          Puedes escribirnos igual: te responderemos dentro del horario.
        </p>
      )}
    </div>
  );
}