'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Crosshair } from 'lucide-react';
import { acotarPorcentaje, FOCO_CENTRO, focoDesdePunto, posicionDeFoco, type FocoImagen } from '../../utils/foco-imagen';
import { Button } from '../buttons/Button';
import { Input } from './Input';

export interface PuntoEnfoqueProps {
  /** La imagen elegida (URL o `data:`). */
  src: string;
  /** Proporción (ancho ÷ alto) del lugar donde se va a mostrar, para la vista «Así se verá». */
  proporcion: number;
  foco: FocoImagen;
  onChange: (foco: FocoImagen) => void;
  /** Para qué imagen es, p. ej. «de escritorio»: va en los nombres accesibles. */
  nombre: string;
  /** Ancho máximo de la vista «Así se verá» (clase de Tailwind); por defecto el de una imagen horizontal. */
  anchoVista?: string;
  /** Sin la vista «Así se verá» (cuando la pantalla ya muestra su propia vista previa en vivo). */
  sinVista?: boolean;
  disabled?: boolean;
}

/**
 * Selector del punto de enfoque de una imagen. La imagen se puede subir de cualquier forma y tamaño; como el lugar donde se
 * muestra tiene una forma fija, aquí se marca qué parte debe quedar a la vista al recortarla. Se marca tocando o arrastrando
 * sobre la imagen completa, o escribiendo los porcentajes (la vía accesible con teclado), y al lado se ve cómo quedará.
 */
export const PuntoEnfoque: React.FC<PuntoEnfoqueProps> = ({ src, proporcion, foco, onChange, nombre, anchoVista = 'max-w-md', sinVista = false, disabled = false }) => {
  const caja = useRef<HTMLDivElement>(null);
  const [arrastrando, setArrastrando] = useState(false);
  // El efecto de abajo se registra una sola vez: siempre llama a la última versión de `onChange`.
  const alCambiar = useRef(onChange);
  alCambiar.current = onChange;

  useEffect(() => {
    const el = caja.current;
    if (el === null || disabled) return;
    const mover = (e: PointerEvent): void => alCambiar.current(focoDesdePunto(e.clientX, e.clientY, el.getBoundingClientRect()));
    const alPresionar = (e: PointerEvent): void => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      setArrastrando(true);
      mover(e);
    };
    const alMover = (e: PointerEvent): void => {
      if (el.hasPointerCapture(e.pointerId)) mover(e);
    };
    const alSoltar = (e: PointerEvent): void => {
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      setArrastrando(false);
    };
    el.addEventListener('pointerdown', alPresionar);
    el.addEventListener('pointermove', alMover);
    el.addEventListener('pointerup', alSoltar);
    el.addEventListener('pointercancel', alSoltar);
    return () => {
      el.removeEventListener('pointerdown', alPresionar);
      el.removeEventListener('pointermove', alMover);
      el.removeEventListener('pointerup', alSoltar);
      el.removeEventListener('pointercancel', alSoltar);
    };
  }, [disabled]);

  const escribir = (eje: 'x' | 'y', texto: string): void => {
    const limpio = texto.replace(/\D/g, '');
    onChange({ ...foco, [eje]: limpio === '' ? 0 : acotarPorcentaje(Number(limpio)) });
  };

  return (
    <div className="space-y-3" data-testid="punto-enfoque">
      <div className={sinVista ? undefined : 'grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]'}>
        <figure className="space-y-1.5">
          <div
            ref={caja}
            className={`relative inline-block max-w-full touch-none select-none overflow-hidden rounded-card border border-neutral-light bg-neutral-lightest ${
              disabled ? 'opacity-60' : arrastrando ? 'cursor-grabbing' : 'cursor-crosshair'
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- vista previa de un archivo local (data:) o de la API */}
            <img src={src} alt={`Imagen ${nombre} completa`} draggable={false} className="block max-h-56 w-auto max-w-full" />
            <span
              aria-hidden="true"
              data-testid="marca-enfoque"
              className="pointer-events-none absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-neutral-white bg-corporate/70 text-neutral-white shadow-md"
              style={{ left: `${foco.x}%`, top: `${foco.y}%` }}
            >
              <Crosshair className="h-4 w-4" />
            </span>
          </div>
          <figcaption className="font-sans text-xs text-neutral-medium">Toque o arrastre sobre la imagen para marcar la parte que debe verse.</figcaption>
        </figure>

        {!sinVista && (
        <figure className="space-y-1.5">
          <div style={{ aspectRatio: String(proporcion) }} className={`w-full overflow-hidden rounded-card border border-neutral-light bg-neutral-lightest ${anchoVista}`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- vista previa de un archivo local (data:) o de la API */}
            <img src={src} alt={`Así se verá la imagen ${nombre}`} className="h-full w-full object-cover" style={{ objectPosition: posicionDeFoco(foco) }} />
          </div>
          <figcaption className="font-sans text-xs text-neutral-medium">Así se verá en el sitio.</figcaption>
        </figure>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-32">
          <Input label="Horizontal (%)" inputMode="numeric" value={String(foco.x)} onChange={(e) => escribir('x', e.target.value)} disabled={disabled} helperText="0 = izquierda" />
        </div>
        <div className="w-32">
          <Input label="Vertical (%)" inputMode="numeric" value={String(foco.y)} onChange={(e) => escribir('y', e.target.value)} disabled={disabled} helperText="0 = arriba" />
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange(FOCO_CENTRO)} disabled={disabled || (foco.x === 50 && foco.y === 50)} className="mb-5">
          Centrar
        </Button>
      </div>
    </div>
  );
};
