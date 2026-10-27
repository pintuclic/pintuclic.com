'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BareButton, Button, IconButton } from '@/core/components';
import type { ColorPaleta } from '../../dtos/m01-catalogo-paleta.dto';
import {
  PX_RUEDA_POR_LAMINA,
  acotarCentro,
  anguloDeLamina,
  centroAlSoltar,
  centroTrasArrastre,
  geometriaAbanico,
  laminaCentral,
  laminaVisible,
  necesitaMasColores,
  pasoDeTecla,
} from '../../services/abanico';
import { colorDeTexto } from '../../services/contraste';

export interface AbanicoColoresProps {
  colores: readonly ColorPaleta[];
  /** Cuántos colores hay en total con el filtro actual (para «14 de 56» y para saber si faltan por cargar). */
  total: number;
  cargando: boolean;
  cargandoMas: boolean;
  elegidoId: number | null;
  onElegir: (color: ColorPaleta) => void;
  onNecesitaMas: () => void;
  /** Cambia cuando cambia el filtro: el abanico vuelve a empezar (P14d). */
  claveFiltro: string;
  /** Con el filtro vacío: cómo limpiarlo (P14f). */
  onLimpiarFiltro: () => void;
  className?: string;
}

const UMBRAL_ARRASTRE_PX = 6;
/** Cuánto sube la lámina elegida, como fracción de su alto. */
const LEVANTE = 0.05;

/**
 * El abanico de la paleta (contrato M01 · P14): la tabla de colores abierta en abanico, grande, que se desliza con el
 * dedo, el cursor, la rueda horizontal, flechas y teclado. Una lámina por color; elegir una la levanta y la deja marcada.
 * Es un grupo de opciones (`radiogroup`): una sola lámina entra en el orden de tabulación y las flechas recorren el resto.
 */
export const AbanicoColores: React.FC<AbanicoColoresProps> = ({
  colores,
  total,
  cargando,
  cargandoMas,
  elegidoId,
  onElegir,
  onNecesitaMas,
  claveFiltro,
  onLimpiarFiltro,
  className = 'relative h-full',
}) => {
  const contenedor = useRef<HTMLDivElement>(null);
  const [medidas, setMedidas] = useState({ ancho: 1000, alto: 560 });
  const [centro, setCentro] = useState(0);
  /** La lámina que recibe el foco del teclado (puede estar lejos del centro cuando la ventana llega a un borde). */
  const [foco, setFoco] = useState(0);
  const [arrastrando, setArrastrando] = useState(false);
  const [menosMovimiento, setMenosMovimiento] = useState(false);
  const laminas = useRef(new Map<number, HTMLButtonElement>());
  const enfocarTras = useRef<number | null>(null);
  const gesto = useRef<{ x: number; centro: number; moviendo: boolean; muestras: Array<{ x: number; t: number }> } | null>(null);
  const hubo = useRef(false);
  const acumuladoRueda = useRef(0);
  const geo = useMemo(() => geometriaAbanico(medidas.ancho, medidas.alto), [medidas]);
  const n = colores.length;
  const centroEntero = laminaCentral(centro, n);

  useEffect(() => {
    const consulta = window.matchMedia('(prefers-reduced-motion: reduce)');
    const leer = (): void => setMenosMovimiento(consulta.matches);
    leer();
    consulta.addEventListener('change', leer);
    return () => consulta.removeEventListener('change', leer);
  }, []);

  useEffect(() => {
    const el = contenedor.current;
    if (el === null) return;
    const observador = new ResizeObserver(([entrada]) => {
      if (entrada === undefined) return;
      setMedidas({ ancho: entrada.contentRect.width, alto: entrada.contentRect.height });
    });
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  // P14d: al cambiar el filtro el abanico vuelve a empezar; si el color elegido está en la lista, queda centrado.
  const ultimaClave = useRef<string | null>(null);
  useEffect(() => {
    if (cargando || ultimaClave.current === claveFiltro) return;
    ultimaClave.current = claveFiltro;
    const i = colores.findIndex((c) => c.idColor === elegidoId);
    setFoco(Math.max(0, i));
    setCentro(acotarCentro(i >= 0 ? i : 0, colores.length, geo.visibles));
  }, [claveFiltro, cargando, colores, elegidoId, geo.visibles]);

  // Si la cantidad de colores o el tamaño cambian, el centro se mantiene dentro de sus límites.
  useEffect(() => {
    setCentro((c) => acotarCentro(c, n, geo.visibles));
  }, [n, geo.visibles]);

  // P4: al acercarse al final de lo cargado se pide la siguiente página.
  useEffect(() => {
    if (!cargandoMas && necesitaMasColores(centroEntero, n, total, geo.visibles)) onNecesitaMas();
  }, [centroEntero, n, total, geo.visibles, cargandoMas, onNecesitaMas]);

  // Tras mover con teclado, el foco sigue a la lámina que queda al centro.
  useEffect(() => {
    if (enfocarTras.current === null) return;
    const i = enfocarTras.current;
    enfocarTras.current = null;
    const id = colores[i]?.idColor;
    if (id !== undefined) laminas.current.get(id)?.focus({ preventScroll: true });
  });

  const irA = useCallback(
    (destino: number, enfocar = false): void => {
      const i = Math.min(Math.max(0, destino), Math.max(0, n - 1));
      setFoco(i);
      setCentro((c) => (Math.abs(i - c) > (geo.visibles - 1) / 2 || !enfocar ? acotarCentro(i, n, geo.visibles) : c));
      if (enfocar) enfocarTras.current = i;
    },
    [n, geo.visibles],
  );

  // La rueda horizontal desliza el abanico; la vertical sigue desplazando la página (no se intercepta).
  useEffect(() => {
    const el = contenedor.current;
    if (el === null) return;
    const alRueda = (e: WheelEvent): void => {
      const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey;
      if (!horizontal) return;
      e.preventDefault();
      acumuladoRueda.current += e.shiftKey && e.deltaX === 0 ? e.deltaY : e.deltaX;
      const pasos = Math.trunc(acumuladoRueda.current / PX_RUEDA_POR_LAMINA);
      if (pasos !== 0) {
        acumuladoRueda.current -= pasos * PX_RUEDA_POR_LAMINA;
        setCentro((c) => acotarCentro(Math.round(c) + pasos, n, geo.visibles));
      }
    };
    el.addEventListener('wheel', alRueda, { passive: false });
    return () => el.removeEventListener('wheel', alRueda);
  }, [n, geo.visibles]);

  const alPresionar = (e: React.PointerEvent<HTMLDivElement>): void => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    gesto.current = { x: e.clientX, centro, moviendo: false, muestras: [{ x: e.clientX, t: e.timeStamp }] };
  };

  const alMover = (e: React.PointerEvent<HTMLDivElement>): void => {
    const g = gesto.current;
    if (g === null) return;
    const dx = e.clientX - g.x;
    if (!g.moviendo) {
      if (Math.abs(dx) < UMBRAL_ARRASTRE_PX) return;
      g.moviendo = true;
      // Solo desde aquí se captura el puntero: un toque simple sigue llegando a la lámina como clic.
      e.currentTarget.setPointerCapture(e.pointerId);
      setArrastrando(true);
    }
    g.muestras.push({ x: e.clientX, t: e.timeStamp });
    if (g.muestras.length > 5) g.muestras.shift();
    setCentro(centroTrasArrastre(g.centro, dx, geo.pxPorLamina, n, geo.visibles));
  };

  const alSoltar = (e: React.PointerEvent<HTMLDivElement>): void => {
    const g = gesto.current;
    gesto.current = null;
    if (g === null || !g.moviendo) return;
    hubo.current = true;
    window.setTimeout(() => (hubo.current = false), 0);
    setArrastrando(false);
    const primera = g.muestras[0];
    const ultima = g.muestras[g.muestras.length - 1];
    const dt = primera !== undefined && ultima !== undefined ? Math.max(1, ultima.t - primera.t) : 1;
    const velocidad = primera !== undefined && ultima !== undefined ? (ultima.x - primera.x) / dt : 0;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    const nuevo = centroAlSoltar(centro, velocidad, geo.pxPorLamina, n, geo.visibles, !menosMovimiento);
    setCentro(nuevo);
    setFoco(laminaCentral(nuevo, n));
  };

  const alTeclear = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    const nuevo = pasoDeTecla(e.key, foco, n);
    if (nuevo === null) return;
    e.preventDefault();
    irA(nuevo, true);
  };

  const elegir = (c: ColorPaleta, indice: number): void => {
    if (hubo.current) return;
    irA(indice);
    onElegir(c);
  };

  const transicion = arrastrando || menosMovimiento ? 'none' : 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1), opacity 300ms';
  const primero = Math.max(0, Math.floor(centro) - geo.visibles);
  const ultimo = Math.min(n - 1, Math.ceil(centro) + geo.visibles);
  const elegido = colores.find((c) => c.idColor === elegidoId) ?? null;

  if (!cargando && n === 0) {
    return (
      <div className={`flex flex-col items-center justify-center gap-4 px-6 text-center ${className}`}>
        <p className="font-title text-lg font-semibold text-corporate">No hay colores con ese filtro</p>
        <p className="font-sans text-sm text-neutral-medium">Pruebe con otra familia, otra marca u otro texto.</p>
        <Button variant="primary-action" onClick={onLimpiarFiltro}>
          Limpiar el filtro
        </Button>
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        ref={contenedor}
        role="radiogroup"
        aria-label="Colores de la paleta"
        aria-busy={cargando}
        onKeyDown={alTeclear}
        onPointerDown={alPresionar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerCancel={alSoltar}
        // `pan-y` deja que el dedo vertical siga desplazando la página; el horizontal desliza el abanico.
        className="relative h-full min-h-[360px] w-full touch-pan-y select-none overflow-hidden"
        style={{ cursor: arrastrando ? 'grabbing' : 'grab' }}
      >
        {cargando && n === 0 && (
          <p role="status" className="absolute inset-0 flex items-center justify-center font-sans text-sm text-neutral-medium">
            Cargando colores…
          </p>
        )}
        {n > 0 &&
          colores.slice(primero, ultimo + 1).map((c, desde) => {
            const i = primero + desde;
            const angulo = anguloDeLamina(i, centro, geo.paso);
            const visible = laminaVisible(i, centro, geo.visibles);
            const marcada = c.idColor === elegidoId;
            const texto = colorDeTexto(c.hexadecimal);
            const sube = marcada ? geo.altoLamina * LEVANTE : 0;
            return (
              <BareButton
                key={c.idColor}
                ref={(el) => {
                  if (el === null) laminas.current.delete(c.idColor);
                  else laminas.current.set(c.idColor, el);
                }}
                role="radio"
                aria-checked={marcada}
                aria-label={`${c.nombre}${c.codigo === null ? '' : `, código ${c.codigo}`}${c.familia === null ? '' : `, ${c.familia}`}`}
                tabIndex={i === foco ? 0 : -1}
                disabled={!visible}
                onClick={() => elegir(c, i)}
                className={`absolute bottom-0 left-1/2 flex flex-col items-center justify-start overflow-hidden rounded-t-[22px] rounded-b-md border border-neutral-white/70 pt-3 shadow-[0_10px_24px_-8px_rgba(0,20,50,0.55)] ${
                  marcada ? 'ring-4 ring-neutral-white' : ''
                }`}
                // Cada lámina gira desde el mismo punto inferior; las que no caben en la ventana se desvanecen.
                style={{
                  width: geo.anchoLamina,
                  height: geo.altoLamina,
                  marginLeft: -geo.anchoLamina / 2,
                  background: c.hexadecimal,
                  color: texto,
                  transformOrigin: '50% 100%',
                  transform: `rotate(${angulo}deg) translateY(${-sube}px) scale(${marcada ? 1.04 : 1})`,
                  transition: transicion,
                  opacity: visible ? 1 : 0,
                  pointerEvents: visible ? 'auto' : 'none',
                  zIndex: marcada ? 40 : 10 + Math.round(10 - Math.abs(i - centro)),
                }}
              >
                <span
                  aria-hidden="true"
                  className="font-title text-[11px] font-bold leading-tight"
                  style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', maxHeight: '62%', overflow: 'hidden' }}
                >
                  {c.nombre}
                </span>
                {c.codigo !== null && (
                  <span aria-hidden="true" className="mt-2 font-mono text-[10px] opacity-80" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                    {c.codigo}
                  </span>
                )}
              </BareButton>
            );
          })}
      </div>

      {n > 0 && (
        // El remache del que salen todas las láminas.
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-1.5 left-1/2 z-[45] h-7 w-7 -translate-x-1/2 rounded-full border-2 border-neutral-white bg-gradient-to-br from-neutral-light to-neutral-medium shadow-md"
        />
      )}

      {n > 1 && (
        <>
          <IconButton
            variant="light"
            aria-label="Colores anteriores"
            disabled={centro <= acotarCentro(0, n, geo.visibles)}
            className="absolute left-3 top-1/2 z-50 -translate-y-1/2"
            onClick={() => irA(laminaCentral(centro, n) - Math.max(1, Math.floor(geo.visibles / 2)), false)}
          >
            <ChevronLeft className="h-6 w-6" />
          </IconButton>
          <IconButton
            variant="light"
            aria-label="Colores siguientes"
            disabled={centro >= acotarCentro(n, n, geo.visibles)}
            className="absolute right-3 top-1/2 z-50 -translate-y-1/2"
            onClick={() => irA(laminaCentral(centro, n) + Math.max(1, Math.floor(geo.visibles / 2)), false)}
          >
            <ChevronRight className="h-6 w-6" />
          </IconButton>
        </>
      )}

      {n > 0 && (
        <p className="pointer-events-none absolute right-3 top-2 z-50 rounded-full bg-neutral-white/90 px-3 py-1 font-sans text-xs font-medium text-neutral-dark shadow-xs">
          Color {centroEntero + 1} de {Math.max(total, n)}{n > geo.visibles || total > n ? ' · desliza para ver más' : ''}
        </p>
      )}

      <p role="status" aria-live="polite" className="sr-only">
        {elegido === null ? '' : `Color elegido: ${elegido.nombre}${elegido.codigo === null ? '' : `, código ${elegido.codigo}`}`}
      </p>
    </div>
  );
};
