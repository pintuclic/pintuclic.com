'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { apiClient } from '../api/apiClient';
import { useAuthStore } from '../store/authStore';
import { EVENTO_CARRITO_ACTUALIZADO } from '../utils/eventos-carrito';

export interface ResumenCarritoCabecera {
  cantidadItems: number;
  total: number;
}

function esResumen(valor: unknown): valor is ResumenCarritoCabecera {
  if (typeof valor !== 'object' || valor === null) return false;
  const v = valor as Record<string, unknown>;
  return typeof v.cantidadItems === 'number' && typeof v.total === 'number';
}

/**
 * Cantidad y total del carrito para la cabecera (`GET /carrito/resumen`, contrato M05 · P4). Se vuelve a
 * leer al cambiar de página, al iniciar o cerrar sesión y cuando el carrito avisa que cambió. Si falla,
 * devuelve null y la cabecera muestra lo que traiga por defecto.
 */
export function useResumenCarrito(): ResumenCarritoCabecera | null {
  const pathname = usePathname();
  const idUsuario = useAuthStore((s) => s.usuario?.idUsuario ?? null);
  const [resumen, setResumen] = useState<ResumenCarritoCabecera | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const alCambiar = (): void => setVersion((v) => v + 1);
    window.addEventListener(EVENTO_CARRITO_ACTUALIZADO, alCambiar);
    return () => window.removeEventListener(EVENTO_CARRITO_ACTUALIZADO, alCambiar);
  }, []);

  useEffect(() => {
    let vigente = true;
    apiClient
      .get<{ success: boolean; data: unknown }>('/carrito/resumen')
      .then(({ data }) => {
        if (vigente && esResumen(data.data)) setResumen(data.data);
      })
      .catch(() => {
        // Sin resumen la cabecera sigue funcionando con sus valores por defecto.
      });
    return () => {
      vigente = false;
    };
  }, [pathname, idUsuario, version]);

  return resumen;
}
