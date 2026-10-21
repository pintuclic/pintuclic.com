'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

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
  className = '',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Bloqueo de scroll en body y manejo de tecla Escape
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeStyles: Record<ModalSize, string> = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnOutsideClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-neutral-black/60 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
    >
      <div
        ref={modalRef}
        className={`
          relative w-full ${sizeStyles[size]} bg-neutral-white rounded-modal shadow-2xl
          overflow-hidden flex flex-col max-h-[90vh] transition-all duration-300
          animate-in zoom-in-95 ${className}
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
                <h3 className="font-title font-semibold text-xl text-neutral-black leading-snug">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="font-sans text-sm text-neutral-medium mt-1">
                  {subtitle}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar modal"
              className="p-1.5 -mr-1 text-neutral-medium hover:text-neutral-black hover:bg-neutral-light/50 rounded-btn transition-colors"
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
            className="absolute top-3.5 right-3.5 z-10 p-1.5 text-neutral-medium hover:text-neutral-black hover:bg-neutral-light/50 rounded-btn transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        )}

        {/* Contenido scrolleable */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};

Modal.displayName = 'Modal';
