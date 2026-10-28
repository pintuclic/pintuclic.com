'use client';

import { useEffect } from 'react';
import { conteosNavegacion } from '../services/presentacion';
import { useGestionStore } from '../store/gestionStore';

/** Cada cuánto se actualiza el contador mientras el panel está abierto: es el único aviso de pedidos nuevos. */
const INTERVALO_MS = 60_000;

/**
 * RF-ORD-05-04 · Cuántos pedidos esperan en cada estado, para mostrarlo en la navegación del panel. Es el
 * ÚNICO aviso al personal: el sistema no envía correo cuando entra un pedido. Quien no tiene «Revisar
 * órdenes» recibe un 404 opaco: el contador queda vacío y el panel funciona igual.
 */
export function useContadorPedidos(): Array<{ etiqueta: string; cantidad: number }> {
  const resumen = useGestionStore((s) => s.resumen);

  useEffect(() => {
    const { cargarResumen } = useGestionStore.getState();
    void cargarResumen();
    const temporizador = setInterval(() => {
      if (document.visibilityState === 'visible') void cargarResumen();
    }, INTERVALO_MS);
    return () => clearInterval(temporizador);
  }, []);

  return conteosNavegacion(resumen);
}
