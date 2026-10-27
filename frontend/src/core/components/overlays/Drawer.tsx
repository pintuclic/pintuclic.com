'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { IconButton } from '../buttons/IconButton';
import { SELECTOR_FOCALIZABLES, siguienteIndiceDeFoco } from './foco';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Título visible; también es el nombre accesible del panel. */
  title: React.ReactNode;
  /** Texto pequeño junto al título (por ejemplo, "3 productos"). */
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  /** Parte fija al pie del panel (totales y botones); el contenido de arriba es el que se desplaza. */
  footer?: React.ReactNode;
  className?: string;
}

/**
 * Panel lateral deslizante desde la derecha (UI Spec §4.7, Variante A): unos 420px en escritorio y todo el ancho en
 * celular, sobre un fondo oscuro. Como el `Modal`, es un diálogo accesible: atrapa el foco, se cierra con Esc o tocando
 * fuera, bloquea el desplazamiento de la página y devuelve el foco a quien lo abrió.
 */
export const Drawer: React.FC<DrawerProps> = ({ isOpen, onClose, title, subtitle, children, footer, className = '' }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const idTitulo = `${useId()}-titulo`;
  // Entra deslizándose: se pinta fuera de la pantalla y en el cuadro siguiente se mueve a su lugar.
  const [visible, setVisible] = useState(false);

  const focalizables = useCallback((): HTMLElement[] => {
    const panel = panelRef.current;
    if (!panel) return [];
    return Array.from(panel.querySelectorAll<HTMLElement>(SELECTOR_FOCALIZABLES)).filter(
      (e) => e.getAttribute('aria-hidden') !== 'true',
    );
  }, []);

  // Apertura: bloqueo de desplazamiento, foco inicial y retorno del foco al cerrar.
  useEffect(() => {
    if (!isOpen) {
      setVisible(false);
      return;
    }
    const previo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflowOriginal = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const cuadro = window.requestAnimationFrame(() => setVisible(true));
    (focalizables()[0] ?? panelRef.current)?.focus();
    return () => {
      window.cancelAnimationFrame(cuadro);
      document.body.style.overflow = overflowOriginal;
      previo?.focus();
    };
  }, [isOpen, focalizables]);

  // Teclado y puntero, aparte para que recrear `onClose` no repita el foco inicial.
  useEffect(() => {
    if (!isOpen) return;
    const alPulsarTecla = (evento: KeyboardEvent): void => {
      if (evento.key === 'Escape') {
        onClose();
        return;
      }
      if (evento.key !== 'Tab') return;
      const elementos = focalizables();
      if (elementos.length === 0) {
        evento.preventDefault();
        panelRef.current?.focus();
        return;
      }
      const activo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const destino = siguienteIndiceDeFoco(elementos.length, activo ? elementos.indexOf(activo) : -1, evento.shiftKey);
      const siguiente = destino >= 0 ? elementos[destino] : undefined;
      if (siguiente) {
        evento.preventDefault();
        siguiente.focus();
      }
    };
    const alPulsarPuntero = (evento: PointerEvent): void => {
      const panel = panelRef.current;
      if (panel && evento.target instanceof Node && !panel.contains(evento.target)) onClose();
    };
    window.addEventListener('keydown', alPulsarTecla);
    document.addEventListener('pointerdown', alPulsarPuntero);
    return () => {
      window.removeEventListener('keydown', alPulsarTecla);
      document.removeEventListener('pointerdown', alPulsarPuntero);
    };
  }, [isOpen, onClose, focalizables]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end bg-neutral-black/50 transition-opacity duration-300 motion-reduce:transition-none ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        className={`flex h-full w-full max-w-[26.25rem] flex-col bg-neutral-white shadow-2xl transition-transform duration-300 ease-out focus-visible:outline-none motion-reduce:transition-none ${
          visible ? 'translate-x-0' : 'translate-x-full'
        } ${className}`}
      >
        <div className="h-1.5 w-full shrink-0 bg-brand-rainbow" aria-hidden="true" />
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-neutral-light px-5 py-4">
          <div>
            <h2 id={idTitulo} className="font-title text-lg font-semibold text-neutral-black">
              {title}
            </h2>
            {subtitle !== undefined && <p className="font-sans text-sm text-neutral-medium">{subtitle}</p>}
          </div>
          <IconButton variant="ghost" size="sm" aria-label="Cerrar" onClick={onClose} className="-mr-1 shrink-0">
            <X className="h-5 w-5" />
          </IconButton>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer !== undefined && <div className="shrink-0 border-t border-neutral-light">{footer}</div>}
      </div>
    </div>
  );
};

Drawer.displayName = 'Drawer';
