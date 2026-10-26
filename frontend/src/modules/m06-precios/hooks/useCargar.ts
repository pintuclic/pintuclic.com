'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { mensajeDeError } from '../services/mensaje-error';

export interface EstadoCarga<T> {
  datos: T | null;
  cargando: boolean;
  error: string | null;
  recargar: () => void;
}

/**
 * Carga un recurso al montar y cada vez que cambia `cargador` (memorícelo con `useCallback`).
 * Descarta la respuesta de una consulta vieja si ya hay otra en curso, para que una búsqueda
 * lenta no pise a la más reciente.
 */
export function useCargar<T>(cargador: () => Promise<T>, mensajeFallo: string): EstadoCarga<T> {
  const [datos, setDatos] = useState<T | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const ultima = useRef(0);

  useEffect(() => {
    const numero = ++ultima.current;
    setCargando(true);
    cargador()
      .then((resultado) => {
        if (numero !== ultima.current) return;
        setDatos(resultado);
        setError(null);
      })
      .catch((err: unknown) => {
        if (numero !== ultima.current) return;
        setError(mensajeDeError(err, mensajeFallo));
      })
      .finally(() => {
        if (numero === ultima.current) setCargando(false);
      });
  }, [cargador, version, mensajeFallo]);

  const recargar = useCallback(() => setVersion((v) => v + 1), []);
  return { datos, cargando, error, recargar };
}

/** Valor que cambia solo 300 ms después de que el original deja de cambiar (búsquedas). */
export function useRetardo<T>(valor: T, milisegundos = 300): T {
  const [retardado, setRetardado] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setRetardado(valor), milisegundos);
    return () => clearTimeout(t);
  }, [valor, milisegundos]);
  return retardado;
}
