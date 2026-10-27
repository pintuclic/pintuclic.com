'use client';

import React, { useCallback, useState } from 'react';
import { Alert, BareButton, Badge, SegmentedTabs } from '@/core/components';
import {
  DEFINICION_ARMONIAS,
  DELTA_E_MUY_PARECIDO,
  DELTA_E_PARECIDO,
  type ArmoniasColor,
  type ColorPaleta,
} from '../../dtos/m01-catalogo-paleta.dto';
import { colorDeTexto, parecidoEnPalabras } from '../../services/contraste';
import { paletaApi } from '../../services/paleta-api';
import { useCargar } from '../../services/useCargarPaleta';
import { AmbientesColor } from './AmbientesColor';

export interface CombinadorColoresProps {
  /** El color elegido; sin él se invita a elegir uno. */
  color: ColorPaleta | null;
  /** Elegir un color real de la carta que sugiere una armonía (P8). */
  onElegir: (color: ColorPaleta) => void;
}

type Pestana = 'combinador' | 'espacio';
const PESTANAS = [
  { value: 'combinador', label: 'Combinador de colores' },
  { value: 'espacio', label: 'En tu espacio' },
] as const satisfies ReadonlyArray<{ value: Pestana; label: string }>;

const Muestra: React.FC<{ hex: string }> = ({ hex }) => (
  <span aria-hidden="true" className="block h-12 flex-1 first:rounded-l-md last:rounded-r-md" style={{ background: hex }} />
);

/**
 * El combinador de colores (contrato M01 · P7, P8): las cuatro armonías del color elegido y, de cada muestra, el color real de
 * la carta más parecido, que se puede elegir con un clic. La segunda pestaña, «En tu espacio», está reservada para M03 (P6).
 */
export const CombinadorColores: React.FC<CombinadorColoresProps> = ({ color, onElegir }) => {
  const [pestana, setPestana] = useState<Pestana>('combinador');
  const idColor = color?.idColor ?? null;
  const armonias = useCargar<ArmoniasColor | null>(
    useCallback(() => (idColor === null ? Promise.resolve(null) : paletaApi.armonias(idColor)), [idColor]),
    'No se pudieron calcular las combinaciones.',
  );

  return (
    <section aria-labelledby="titulo-combinador" className="space-y-4 rounded-card border border-neutral-light bg-neutral-white p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="titulo-combinador" className="font-title text-xl font-bold text-corporate">
          {pestana === 'combinador' ? 'Combinador de colores' : 'En tu espacio'}
        </h2>
        <div className="w-full sm:w-auto sm:min-w-[320px]">
          <SegmentedTabs options={PESTANAS} value={pestana} onChange={setPestana} ariaLabel="Qué ver del color elegido" panelId="panel-combinador" idPrefix="combinador" />
        </div>
      </div>

      <div id="panel-combinador" role="tabpanel" aria-labelledby={`combinador-tab-${pestana}`}>
        {pestana === 'espacio' ? (
          <AmbientesColor color={color} />
        ) : color === null ? (
          <p className="rounded-card border border-dashed border-neutral-light bg-neutral-lightest px-4 py-10 text-center font-sans text-sm text-neutral-medium">
            Elige un color en el abanico y aquí verás los colores que combinan con él.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4 rounded-card bg-neutral-lightest p-3">
              <span aria-hidden="true" className="h-14 w-14 shrink-0 rounded-card border border-neutral-light" style={{ background: color.hexadecimal }} />
              <div className="min-w-0">
                <p className="truncate font-title text-lg font-bold text-neutral-black">{color.nombre}</p>
                <p className="font-sans text-xs text-neutral-medium">
                  {[color.codigo, color.hexadecimal, color.marca, color.familia].filter((x): x is string => x !== null).join(' · ')}
                </p>
              </div>
            </div>

            {armonias.error !== null && <Alert variant="error">{armonias.error}</Alert>}
            {armonias.cargando && armonias.datos === null && <p role="status" className="font-sans text-sm text-neutral-medium">Calculando combinaciones…</p>}
            {armonias.datos?.sinTono === true && (
              <Alert variant="info">Este color casi no tiene tono: las combinaciones usan claridad.</Alert>
            )}

            {armonias.datos !== null && armonias.datos.color.idColor === color.idColor && (
              <ul className="grid gap-3 sm:grid-cols-2">
                {armonias.datos.armonias.map((a) => {
                  const def = DEFINICION_ARMONIAS[a.tipo];
                  return (
                    <li key={a.tipo} data-armonia={a.tipo} className="space-y-2 rounded-card border border-neutral-light p-3">
                      <div>
                        <h3 className="font-title text-sm font-semibold text-corporate">{def.etiqueta}</h3>
                        <p className="font-sans text-xs text-neutral-medium">{def.descripcion}</p>
                      </div>
                      <div className="flex overflow-hidden rounded-md border border-neutral-light" role="img" aria-label={`Muestras de ${def.etiqueta.toLowerCase()}: ${a.muestras.map((m) => m.hexadecimal).join(', ')}`}>
                        {a.muestras.map((m, i) => (
                          <Muestra key={`${m.hexadecimal}-${i}`} hex={m.hexadecimal} />
                        ))}
                      </div>
                      <ul className="flex flex-wrap gap-2">
                        {a.muestras.map((m, i) =>
                          m.cercano === null ? (
                            <li key={`${m.hexadecimal}-${i}`}>
                              <Badge variant="neutral" title="Ningún color de la carta se parece lo suficiente">
                                {m.hexadecimal} · sin color parecido en la carta
                              </Badge>
                            </li>
                          ) : (
                            <li key={`${m.hexadecimal}-${i}`}>
                              <BareButton
                                onClick={() => (m.cercano === null ? undefined : onElegir(m.cercano))}
                                aria-label={`Elegir ${m.cercano.nombre}, ${parecidoEnPalabras(m.cercano.deltaE, DELTA_E_MUY_PARECIDO, DELTA_E_PARECIDO)}`}
                                className="flex min-h-[44px] items-center gap-2 rounded-full border border-neutral-light bg-neutral-white py-1 pl-1 pr-3 text-left hover:border-action"
                              >
                                <span aria-hidden="true" className="h-8 w-8 shrink-0 rounded-full border border-neutral-light" style={{ background: m.cercano.hexadecimal, color: colorDeTexto(m.cercano.hexadecimal) }} />
                                <span className="font-sans text-xs leading-tight text-neutral-black">
                                  <span className="block font-semibold">{m.cercano.nombre}</span>
                                  <span className="block text-neutral-medium">{parecidoEnPalabras(m.cercano.deltaE, DELTA_E_MUY_PARECIDO, DELTA_E_PARECIDO)}</span>
                                </span>
                              </BareButton>
                            </li>
                          ),
                        )}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
