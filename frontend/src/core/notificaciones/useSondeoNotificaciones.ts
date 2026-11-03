'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '../store/authStore';
import { usarSondeo } from './gestorSondeo';
import { cantidadDeSeccion, useNotificacionesStore } from './notificacionesStore';
import { seccionDeRuta } from './sondeo';

/**
 * Activa los avisos de la persona que tiene sesión (FP-02): arranca el sondeo compartido y, al entrar a una sección con
 * novedades, las marca leídas para apagar su punto rojo (R7). Sin sesión no hace nada.
 */
export function useSondeoNotificaciones(): void {
  const idUsuario = useAuthStore((s) => s.usuario?.idUsuario ?? null);
  const pathname = usePathname();
  const resumen = useNotificacionesStore((s) => s.resumen);
  const cargado = useNotificacionesStore((s) => s.cargado);
  const leerSeccion = useNotificacionesStore((s) => s.leerSeccion);

  useEffect(() => {
    if (idUsuario === null) return undefined;
    return usarSondeo();
  }, [idUsuario]);

  const seccion = seccionDeRuta(pathname);
  const pendientes = seccion === null ? 0 : cantidadDeSeccion(resumen, seccion);
  useEffect(() => {
    if (cargado && seccion !== null && pendientes > 0) void leerSeccion(seccion);
  }, [cargado, seccion, pendientes, leerSeccion]);
}
