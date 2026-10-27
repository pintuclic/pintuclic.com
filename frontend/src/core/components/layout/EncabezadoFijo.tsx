'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { franjaVisible } from '../../utils/encabezado';

export interface EncabezadoFijoProps {
  /** La franja azul con la información básica: se esconde al bajar y reaparece al subir. */
  franja: ReactNode;
  /** La cabecera principal: queda siempre arriba. */
  children: ReactNode;
}

/**
 * Cabecera fija de las páginas públicas: todo queda pegado arriba (`position: fixed`). La franja de información se esconde
 * cuando la persona baja y vuelve a aparecer cuando sube; la cabecera principal no se mueve. Se reserva el alto de ambas
 * para que el contenido no salte, y la franja se esconde plegándose (no con `transform`, que rompería los menús y modales
 * que la cabecera abre con `position: fixed`). Con `prefers-reduced-motion` el cambio es inmediato.
 */
export function EncabezadoFijo({ franja, children }: EncabezadoFijoProps) {
  const franjaRef = useRef<HTMLDivElement>(null);
  const cabeceraRef = useRef<HTMLDivElement>(null);
  const [alturas, setAlturas] = useState({ franja: 0, cabecera: 0 });
  const [visible, setVisible] = useState(true);
  const [menosMovimiento, setMenosMovimiento] = useState(false);
  const estado = useRef({ visible: true, anterior: 0, esperando: false });

  useEffect(() => {
    const consulta = window.matchMedia('(prefers-reduced-motion: reduce)');
    const leer = (): void => setMenosMovimiento(consulta.matches);
    leer();
    consulta.addEventListener('change', leer);
    return () => consulta.removeEventListener('change', leer);
  }, []);

  useEffect(() => {
    const medir = (): void =>
      setAlturas({ franja: franjaRef.current?.offsetHeight ?? 0, cabecera: cabeceraRef.current?.offsetHeight ?? 0 });
    medir();
    const observador = new ResizeObserver(medir);
    if (franjaRef.current !== null) observador.observe(franjaRef.current);
    if (cabeceraRef.current !== null) observador.observe(cabeceraRef.current);
    return () => observador.disconnect();
  }, []);

  useEffect(() => {
    const e = estado.current;
    e.anterior = window.scrollY;
    const alMover = (): void => {
      if (e.esperando) return;
      e.esperando = true;
      window.requestAnimationFrame(() => {
        e.esperando = false;
        const y = Math.max(0, window.scrollY);
        const siguiente = franjaVisible(e.visible, y, e.anterior, franjaRef.current?.offsetHeight ?? 0);
        // El scroll de referencia solo avanza cuando hubo un cambio de sentido real o de estado.
        if (Math.abs(y - e.anterior) > 8 || siguiente !== e.visible) e.anterior = y;
        if (siguiente !== e.visible) {
          e.visible = siguiente;
          setVisible(siguiente);
        }
      });
    };
    window.addEventListener('scroll', alMover, { passive: true });
    return () => window.removeEventListener('scroll', alMover);
  }, []);

  return (
    <>
      {/* Reserva el alto de todo el encabezado: el contenido no se corre cuando la franja se esconde. */}
      <div aria-hidden="true" style={{ height: alturas.franja + alturas.cabecera }} />
      <div
        data-testid="encabezado-fijo"
        className="fixed inset-x-0 top-0 z-50"
        // Con el foco dentro (teclado) la franja vuelve: no se esconde lo que se está usando.
        onFocusCapture={() => {
          estado.current.visible = true;
          setVisible(true);
        }}
      >
        <div
          data-testid="franja-superior"
          data-visible={visible}
          className="overflow-hidden"
          style={{
            height: visible ? alturas.franja || undefined : 0,
            transition: menosMovimiento ? 'none' : 'height 240ms ease',
          }}
        >
          <div ref={franjaRef}>{franja}</div>
        </div>
        <div ref={cabeceraRef}>{children}</div>
      </div>
    </>
  );
}
