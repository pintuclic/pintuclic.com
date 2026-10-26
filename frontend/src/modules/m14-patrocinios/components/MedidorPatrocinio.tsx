'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import type { UbicacionPatrocinio } from '../dtos/m14-patrocinios.dto';
import { useImpresion } from '../hooks/useImpresion';
import { avisarMedicion } from '../services/medicion-cliente';

export interface MedidorPatrocinioProps {
  /** La campaña que puso el producto aquí; sin ella (patrocinio del interruptor antiguo) no se mide. */
  idCampania: number | null;
  ubicacion: UbicacionPatrocinio;
  children: React.ReactNode;
  className?: string;
}

/**
 * Mide una tarjeta de producto patrocinado (contrato M14 · M3, M4): avisa la impresión cuando queda visible al menos
 * 50 % durante 1 segundo y el clic cuando se entra a la ficha. No cambia cómo se ve ni cómo funciona la tarjeta: el
 * aviso lo manda el navegador en segundo plano y nunca bloquea la navegación.
 */
export const MedidorPatrocinio: React.FC<MedidorPatrocinioProps> = ({ idCampania, ubicacion, children, className }) => {
  const ref = useRef<HTMLDivElement>(null);
  useImpresion(
    ref,
    useCallback(() => {
      if (idCampania !== null) avisarMedicion({ entidad: 'campania', tipo: 'impresion', id: idCampania, ubicacion });
    }, [idCampania, ubicacion]),
    idCampania !== null,
  );

  // El clic se escucha desde fuera del JSX: este contenedor solo envuelve, no es un control (accesibilidad).
  useEffect(() => {
    const contenedor = ref.current;
    if (idCampania === null || contenedor === null) return;
    const alHacerClic = (e: MouseEvent): void => {
      // Solo el paso a la ficha cuenta como clic; agregar al carrito u otros botones de la tarjeta, no.
      if (e.target instanceof Element && e.target.closest('a[href]') !== null) {
        avisarMedicion({ entidad: 'campania', tipo: 'clic', id: idCampania, ubicacion });
      }
    };
    contenedor.addEventListener('click', alHacerClic, true);
    return () => contenedor.removeEventListener('click', alHacerClic, true);
  }, [idCampania, ubicacion]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
};
