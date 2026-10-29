'use client';

import { useEffect, useState } from 'react';
import { mensajeDeError } from '@/core/utils/errorApi';

export interface EstadoReporte<T> {
  datos: T | null;
  error: string | null;
  cargando: boolean;
}

/** Pide un reporte cada vez que cambia `clave` (el rango, la agrupación…). Una respuesta vieja nunca pisa a una nueva. */
export function useReporte<T>(clave: string, pedir: () => Promise<T>): EstadoReporte<T> {
  const [estado, setEstado] = useState<EstadoReporte<T>>({ datos: null, error: null, cargando: true });
  useEffect(() => {
    let vigente = true;
    setEstado((e) => ({ ...e, cargando: true, error: null }));
    pedir()
      .then((datos) => vigente && setEstado({ datos, error: null, cargando: false }))
      .catch((err: unknown) => {
        if (!vigente) return;
        const status = (err as { response?: { status?: number } }).response?.status;
        setEstado({ datos: null, cargando: false, error: status === 404 ? 'No tienes acceso a este reporte.' : mensajeDeError(err) });
      });
    return () => {
      vigente = false;
    };
    // `pedir` cambia en cada render; lo que decide cuándo volver a pedir es `clave`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);
  return estado;
}
