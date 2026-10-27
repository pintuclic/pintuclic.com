'use client';

import { useEffect, useRef, useState } from 'react';
import { isAxiosError } from 'axios';

export interface EstadoCargaPaleta<T> {
  datos: T | null;
  cargando: boolean;
  error: string | null;
}

/** Carga un recurso al montar y cada vez que cambia `cargador`; descarta respuestas viejas (una consulta lenta no pisa a la nueva). */
export function useCargar<T>(cargador: () => Promise<T>, mensajeFallo: string): EstadoCargaPaleta<T> {
  const [estado, setEstado] = useState<EstadoCargaPaleta<T>>({ datos: null, cargando: true, error: null });
  const ultima = useRef(0);
  useEffect(() => {
    const numero = ++ultima.current;
    setEstado((e) => ({ ...e, cargando: true }));
    cargador()
      .then((datos) => numero === ultima.current && setEstado({ datos, cargando: false, error: null }))
      .catch((err: unknown) => {
        if (numero !== ultima.current) return;
        const sinColor = isAxiosError(err) && err.response?.status === 404;
        setEstado({ datos: null, cargando: false, error: sinColor ? null : mensajeFallo });
      });
  }, [cargador, mensajeFallo]);
  return estado;
}
