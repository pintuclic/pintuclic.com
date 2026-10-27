'use client';

import React from 'react';
import { ChevronsDown } from 'lucide-react';
import { Button } from '@/core/components';
import type { ColorPaleta } from '../../dtos/m01-catalogo-paleta.dto';
import { colorDeTexto } from '../../services/contraste';

export interface OndaColorProps {
  /** El color elegido; sin color no hay onda (P15). */
  color: ColorPaleta | null;
  /** A qué sección baja el botón. */
  destinoId: string;
  onVerProductos: () => void;
}

const CAMINO_A =
  'M0 60 C 120 10, 240 110, 360 60 S 600 10, 720 60 S 960 110, 1080 60 S 1320 10, 1440 60 S 1680 110, 1800 60 S 2040 10, 2160 60 S 2400 110, 2520 60 S 2760 10, 2880 60 L2880 200 L0 200 Z';
const CAMINO_B =
  'M0 80 C 150 130, 270 20, 360 80 S 570 140, 720 80 S 990 20, 1080 80 S 1290 140, 1440 80 S 1710 20, 1800 80 S 2010 140, 2160 80 S 2430 20, 2520 80 S 2730 140, 2880 80 L2880 200 L0 200 Z';

/**
 * La onda de la selección (contrato M01 · P15): aparece abajo del abanico, pintada con el color elegido, con su nombre y
 * un botón que baja a los productos de ese color. El texto es blanco o negro según el contraste. Se anima despacio
 * (movimiento horizontal) salvo con `prefers-reduced-motion`.
 */
export const OndaColor: React.FC<OndaColorProps> = ({ color, destinoId, onVerProductos }) => {
  if (color === null) return null;
  const texto = colorDeTexto(color.hexadecimal);
  return (
    <div
      data-testid="onda-color"
      // `key` en el color: al cambiar de color la onda se vuelve a pintar con su entrada.
      key={color.idColor}
      className="onda-entrada pointer-events-none absolute inset-x-0 bottom-0 z-[60]"
    >
      <style>{`
        @keyframes onda-subir { from { transform: translateY(100%); opacity: 0.4; } to { transform: translateY(0); opacity: 1; } }
        @keyframes onda-corre-a { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes onda-corre-b { from { transform: translateX(-50%); } to { transform: translateX(0); } }
        .onda-entrada { animation: onda-subir 520ms cubic-bezier(0.22, 1, 0.36, 1) both; }
        .onda-a { animation: onda-corre-a 14s linear infinite; }
        .onda-b { animation: onda-corre-b 20s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .onda-entrada, .onda-a, .onda-b { animation: none; }
        }
      `}</style>
      <div className="relative h-[150px] overflow-hidden sm:h-[170px]" aria-hidden="true">
        <svg className="onda-a absolute bottom-0 left-0 h-full w-[200%]" viewBox="0 0 2880 200" preserveAspectRatio="none" focusable="false">
          <path d={CAMINO_A} fill={color.hexadecimal} fillOpacity="0.55" />
        </svg>
        <svg className="onda-b absolute bottom-0 left-0 h-[88%] w-[200%]" viewBox="0 0 2880 200" preserveAspectRatio="none" focusable="false">
          <path d={CAMINO_B} fill={color.hexadecimal} />
        </svg>
      </div>
      {/* El texto va sobre la parte sólida de la onda. */}
      <div
        className="pointer-events-auto absolute inset-x-0 bottom-0 flex flex-col items-center justify-center gap-2 px-4 pb-3 text-center sm:flex-row sm:gap-6 sm:pb-4"
        style={{ color: texto }}
      >
        <p className="font-title text-base font-bold leading-tight sm:text-xl">
          {color.nombre}
          {color.codigo !== null && <span className="ml-2 font-mono text-xs font-medium opacity-80 sm:text-sm">{color.codigo}</span>}
        </p>
        <Button
          variant="outline"
          size="lg"
          rightIcon={<ChevronsDown className="h-5 w-5" aria-hidden="true" />}
          onClick={onVerProductos}
          aria-controls={destinoId}
          aria-label={`Ver productos en ${color.nombre}`}
          className="border-2 shadow-lg"
          style={{ backgroundColor: texto === '#000000' ? '#FFFFFF' : '#000000', color: texto === '#000000' ? '#000000' : '#FFFFFF', borderColor: texto }}
        >
          <span className="sm:hidden">Ver productos</span>
          <span className="hidden sm:inline">Ver productos en {color.nombre}</span>
        </Button>
      </div>
    </div>
  );
};
