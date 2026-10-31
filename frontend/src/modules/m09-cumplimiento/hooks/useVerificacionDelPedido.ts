'use client';

import { useEffect, useRef } from 'react';
import { useCumplimientoStore } from '../store/cumplimientoStore';

/**
 * Carga la lista de chequeo de un pedido mientras `activo` y la suelta al irse o al dejar de estar activo. Cada vez que
 * se guarda una marca llama a `alCambiar`: el estado de cada producto que se ve en la lista sale del detalle del pedido y
 * hay que volver a pedirlo (la lista de chequeo y el detalle no pueden mostrar cosas distintas).
 */
export function useVerificacionDelPedido(codigo: string, activo: boolean, alCambiar: () => void): void {
  const guardados = useCumplimientoStore((s) => s.guardados);
  const alCambiarRef = useRef(alCambiar);
  alCambiarRef.current = alCambiar;

  useEffect(() => {
    if (!activo) return;
    void useCumplimientoStore.getState().cargar(codigo);
    return () => useCumplimientoStore.getState().limpiar();
  }, [codigo, activo]);

  useEffect(() => {
    if (guardados > 0) alCambiarRef.current();
  }, [guardados]);
}
