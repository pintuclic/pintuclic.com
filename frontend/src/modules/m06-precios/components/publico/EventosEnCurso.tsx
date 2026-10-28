'use client';

import React, { useEffect, useState } from 'react';
import { Percent } from 'lucide-react';
import type { EventoPublico } from '../../dtos/m06-precios.dto';
import { eventosPublicosApi } from '../../services/precios-api';
import { formatearPorcentaje, resumenCalendario } from '../../services/etiquetas';

/**
 * Eventos de descuento que están en curso, para encabezar «Ofertas». Si no hay ninguno, o la consulta falla,
 * no se muestra nada: la lista de productos en oferta se basta sola.
 */
export const EventosEnCurso: React.FC = () => {
  const [eventos, setEventos] = useState<EventoPublico[]>([]);

  useEffect(() => {
    let vigente = true;
    eventosPublicosApi
      .enCurso()
      .then((lista) => vigente && setEventos(lista))
      .catch(() => vigente && setEventos([]));
    return () => {
      vigente = false;
    };
  }, []);

  if (eventos.length === 0) return null;
  return (
    <section aria-labelledby="titulo-eventos-en-curso" className="space-y-3">
      <h2 id="titulo-eventos-en-curso" className="font-title text-lg font-bold text-corporate">
        Promociones activas ahora
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {eventos.map((e) => (
          <li
            key={e.idEvento}
            className="flex gap-3 rounded-card border border-offer/30 bg-neutral-white p-4 shadow-card"
          >
            <span
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-offer/10 text-offer"
            >
              <Percent className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="font-title text-sm font-semibold text-neutral-black">{e.nombre}</p>
              <p className="font-title text-sm font-bold text-offer">
                Hasta {formatearPorcentaje(e.porcentajeMaximo)} de descuento
              </p>
              {e.descripcion !== null && e.descripcion !== '' && (
                <p className="mt-1 font-sans text-xs text-neutral-dark">{e.descripcion}</p>
              )}
              <p className="mt-1 font-sans text-xs text-neutral-medium">{resumenCalendario(e.calendario)}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};
