'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { franjaVisible } from '../../utils/encabezado';

export interface EncabezadoFijoProps {
  /** La franja azul con la información básica: solo se ve con la página arriba de todo. */
  franja: ReactNode;
  /** La cabecera principal: queda siempre arriba. */
  children: ReactNode;
}

/**
 * Cabecera fija de las páginas públicas: todo queda pegado arriba (`position: fixed`). La franja de información solo se
 * ve con la página arriba de todo: al bajar se pliega y no vuelve hasta regresar al inicio (que reaparezca al subir un poco
 * movía la cabecera bajo el puntero justo al ir a hacer clic). La cabecera principal no se mueve. Se reserva el alto de ambas
 * para que el contenido no salte, y la franja se esconde plegándose (no con `transform`, que rompería los menús y modales
 * que la cabecera abre con `position: fixed`). Con `prefers-reduced-motion` el cambio es inmediato.
 */
export function EncabezadoFijo({ franja, children }: EncabezadoFijoProps) {
  const franjaRef = useRef<HTMLDivElement>(null);
  const cabeceraRef = useRef<HTMLDivElement>(null);
  const [alturas, setAlturas] = useState({ franja: 0, cabecera: 0 });
  const [visible, setVisible] = useState(true);
  const [menosMovimiento, setMenosMovimiento] = useState(false);
  const estado = useRef({ visible: true, esperando: false });

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
    const actualizar = (): void => {
      const siguiente = franjaVisible(window.scrollY);
      if (siguiente !== e.visible) {
        e.visible = siguiente;
        setVisible(siguiente);
      }
    };
    actualizar();
    const alMover = (): void => {
      if (e.esperando) return;
      e.esperando = true;
      window.requestAnimationFrame(() => {
        e.esperando = false;
        actualizar();
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
          {/* Plegada no se puede enfocar ni leer: la misma información está en el pie y en el Centro de ayuda. */}
          <div ref={franjaRef} inert={!visible} aria-hidden={!visible}>
            {franja}
          </div>
        </div>
        <div ref={cabeceraRef}>{children}</div>
      </div>
    </>
  );
}
