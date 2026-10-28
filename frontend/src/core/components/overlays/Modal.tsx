'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { SELECTOR_FOCALIZABLES, siguienteIndiceDeFoco } from './foco';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  size?: ModalSize;
  showRainbowStrip?: boolean;
  closeOnOutsideClick?: boolean;
  /**
   * Nombre accesible del diálogo cuando se abre sin `title`.
   * Con `title` presente el nombre se toma del encabezado vía `aria-labelledby`.
   */
  ariaLabel?: string;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  size = 'md',
  showRainbowStrip = true,
  closeOnOutsideClick = true,
  ariaLabel,
  className = '',
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const elementoPrevioRef = useRef<HTMLElement | null>(null);
  // El portal necesita `document`, que no existe al renderizar en el servidor.
  const [enElNavegador, setEnElNavegador] = useState(false);
  useEffect(() => setEnElNavegador(true), []);

  const idBase = useId();
  const idTitulo = `${idBase}-titulo`;
  const idSubtitulo = `${idBase}-subtitulo`;

  /** Elementos focalizables del panel, en orden de documento. */
  const obtenerFocalizables = useCallback((): HTMLElement[] => {
    const panel = panelRef.current;
    if (!panel) return [];

    return Array.from(
      panel.querySelectorAll<HTMLElement>(SELECTOR_FOCALIZABLES)
    ).filter((elemento) => elemento.getAttribute('aria-hidden') !== 'true');
  }, []);

  // Apertura y cierre: bloqueo de scroll, foco inicial y retorno del foco.
  // Depende solo de `isOpen` para no robar el foco en cada re-render.
  useEffect(() => {
    if (!isOpen) return;

    const elementoPrevio =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    elementoPrevioRef.current = elementoPrevio;

    const overflowOriginal = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const primerFocalizable = obtenerFocalizables()[0];
    if (primerFocalizable) {
      primerFocalizable.focus();
    } else {
      panelRef.current?.focus();
    }

    return () => {
      document.body.style.overflow = overflowOriginal;
      // Devuelve el foco al disparador para no dejar al teclado en el <body>.
      elementoPrevio?.focus();
    };
  }, [isOpen, obtenerFocalizables]);

  // Teclado y puntero. Se mantiene aparte para que recrear `onClose` en el
  // componente padre no vuelva a ejecutar el foco inicial.
  useEffect(() => {
    if (!isOpen) return;

    const alPulsarTecla = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        onClose();
        return;
      }

      if (evento.key !== 'Tab') return;

      const elementos = obtenerFocalizables();
      if (elementos.length === 0) {
        evento.preventDefault();
        panelRef.current?.focus();
        return;
      }

      const activo =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const indiceActual = activo ? elementos.indexOf(activo) : -1;
      const destino = siguienteIndiceDeFoco(elementos.length, indiceActual, evento.shiftKey);

      const siguiente = destino >= 0 ? elementos[destino] : undefined;
      if (siguiente) {
        evento.preventDefault();
        siguiente.focus();
      }
    };

    // Cierre por puntero fuera del panel, sin manejador de clic en el fondo:
    // así el contenedor decorativo no necesita semántica interactiva.
    const alPulsarPuntero = (evento: PointerEvent) => {
      if (!closeOnOutsideClick) return;

      const panel = panelRef.current;
      if (panel && evento.target instanceof Node && !panel.contains(evento.target)) {
        onClose();
      }
    };

    window.addEventListener('keydown', alPulsarTecla);
    document.addEventListener('pointerdown', alPulsarPuntero);

    return () => {
      window.removeEventListener('keydown', alPulsarTecla);
      document.removeEventListener('pointerdown', alPulsarPuntero);
    };
  }, [isOpen, onClose, closeOnOutsideClick, obtenerFocalizables]);

  if (!isOpen || !enElNavegador) return null;

  const sizeStyles: Record<ModalSize, string> = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  /*
   * Se dibuja colgado de <body> y no donde está escrito.
   *
   * `position: fixed` NO basta: si un ancestro crea un contexto de apilamiento —y basta con
   * un `position: sticky`, como el panel de compra de la ficha de producto— el modal queda
   * encerrado dentro de ese contexto, por debajo de la cabecera fija. Se veía: el velo gris
   * se cortaba bajo la cabecera, que quedaba sin oscurecer, y el modal aparecía recortado.
   * Subirle el z-index no sirve de nada estando encerrado; sacarlo del árbol sí.
   */
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-neutral-black/60 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? idTitulo : undefined}
        aria-label={title ? undefined : ariaLabel}
        aria-describedby={subtitle ? idSubtitulo : undefined}
        tabIndex={-1}
        className={`
          relative w-full ${sizeStyles[size]} bg-neutral-white rounded-modal shadow-2xl
          overflow-hidden flex flex-col max-h-[90vh] transition-all duration-300
          animate-in zoom-in-95 focus-visible:outline-none ${className}
        `}
      >
        {/* Franja decorativa superior en degradado de marca (UI Spec secciones 4.2 y 4.6) */}
        {showRainbowStrip && (
          <div
            className="h-1.5 w-full bg-brand-rainbow shrink-0"
            aria-hidden="true"
          />
        )}

        {/* Encabezado del modal */}
        {(title || subtitle) && (
          <div className="flex items-start justify-between p-5 sm:p-6 pb-2 border-b border-neutral-light/40 shrink-0">
            <div>
              {title && (
                <h3
                  id={idTitulo}
                  className="font-title font-semibold text-xl text-neutral-black leading-snug"
                >
                  {title}
                </h3>
              )}
              {subtitle && (
                <p id={idSubtitulo} className="font-sans text-sm text-neutral-medium mt-1">
                  {subtitle}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar modal"
              className="p-1.5 -mr-1 text-neutral-medium hover:text-neutral-black hover:bg-neutral-light/50 rounded-btn transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Botón de cierre flotante si no hay título */}
        {!title && !subtitle && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="absolute top-3.5 right-3.5 z-10 p-1.5 text-neutral-medium hover:text-neutral-black hover:bg-neutral-light/50 rounded-btn transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        )}

        {/* Contenido scrolleable */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>,
    document.body,
  );
};

Modal.displayName = 'Modal';
