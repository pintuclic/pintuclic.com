'use client';

import { useEffect, useRef, type RefObject } from 'react';

/** M3: visible al menos la mitad durante un segundo. */
export const VISIBLE_MINIMO = 0.5;
export const SEGUNDOS_VISIBLE = 1;

/**
 * Llama a `alVer` una sola vez cuando el elemento queda visible al menos 50 % durante 1 segundo seguido y la pestaña
 * está a la vista. Si sale de pantalla antes del segundo, el conteo se reinicia. Sin `IntersectionObserver` (navegadores
 * muy viejos) no avisa: es preferible no contar a contar de más.
 */
export function useImpresion(ref: RefObject<Element | null>, alVer: () => void, activo = true): void {
  // La última versión de `alVer`, sin volver a armar el observador en cada pintado.
  const ultimo = useRef(alVer);
  useEffect(() => {
    ultimo.current = alVer;
  }, [alVer]);

  useEffect(() => {
    const elemento = ref.current;
    if (!activo || elemento === null || typeof IntersectionObserver === 'undefined') return;
    let temporizador: ReturnType<typeof setTimeout> | null = null;
    const observador = new IntersectionObserver(
      (entradas) => {
        const visible = entradas.some((e) => e.isIntersecting && e.intersectionRatio >= VISIBLE_MINIMO);
        if (!visible) {
          if (temporizador !== null) clearTimeout(temporizador);
          temporizador = null;
          return;
        }
        temporizador ??= setTimeout(() => {
          if (document.visibilityState !== 'visible') {
            temporizador = null;
            return;
          }
          observador.disconnect();
          ultimo.current();
        }, SEGUNDOS_VISIBLE * 1000);
      },
      { threshold: [0, VISIBLE_MINIMO, 1] },
    );
    observador.observe(elemento);
    return () => {
      if (temporizador !== null) clearTimeout(temporizador);
      observador.disconnect();
    };
  }, [ref, activo]);
}
