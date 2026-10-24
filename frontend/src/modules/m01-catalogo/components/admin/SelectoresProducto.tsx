'use client';

import React, { useCallback, useState } from 'react';
import { X } from 'lucide-react';
import { Checkbox, Input } from '@/core/components';
import { useCargar, useRetardo } from '../../hooks/useCargar';
import { coloresApi } from '../../services/catalogo-api';
import { Muestra } from './comunes';

export interface OpcionCheck {
  id: number;
  nombre: string;
}

export interface ListaCheckProps {
  titulo: string;
  ayuda?: string;
  opciones: OpcionCheck[];
  seleccionados: number[];
  onChange: (ids: number[]) => void;
  vacio: string;
}

/** Conjunto de casillas para elegir varios elementos de un catálogo pequeño. */
export const ListaCheck: React.FC<ListaCheckProps> = ({ titulo, ayuda, opciones, seleccionados, onChange, vacio }) => {
  const alternar = (id: number, marcado: boolean) =>
    onChange(marcado ? [...seleccionados, id] : seleccionados.filter((x) => x !== id));
  return (
    <fieldset className="space-y-2">
      <legend className="font-title text-sm font-medium text-neutral-dark">{titulo}</legend>
      {ayuda !== undefined && <p className="font-sans text-xs text-neutral-medium">{ayuda}</p>}
      {opciones.length === 0 ? (
        <p className="font-sans text-sm text-neutral-medium">{vacio}</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {opciones.map((o) => (
            <Checkbox
              key={o.id}
              id={`${titulo}-${o.id}`}
              label={o.nombre}
              checked={seleccionados.includes(o.id)}
              onChange={(e) => alternar(o.id, e.target.checked)}
            />
          ))}
        </div>
      )}
    </fieldset>
  );
};

export interface ColorElegido {
  id: number;
  nombre: string;
  hexadecimal: string | null;
}

export interface SelectorColoresFabricaProps {
  idMarca: number | null;
  elegidos: ColorElegido[];
  onChange: (colores: ColorElegido[]) => void;
}

/** P6: colores de fábrica (ICO, aerosoles, transparente…): solo de la marca del producto, con buscador. */
export const SelectorColoresFabrica: React.FC<SelectorColoresFabricaProps> = ({ idMarca, elegidos, onChange }) => {
  const [busqueda, setBusqueda] = useState('');
  const termino = useRetardo(busqueda);
  const cargador = useCallback(
    () =>
      idMarca === null || termino.trim().length < 2
        ? Promise.resolve(null)
        : coloresApi.listar({ idMarca, busqueda: termino, estado: 'activo', limite: 8 }),
    [idMarca, termino],
  );
  const { datos } = useCargar(cargador, 'No se pudo buscar colores.');
  const idsElegidos = new Set(elegidos.map((c) => c.id));
  const candidatos = datos?.items.filter((c) => !idsElegidos.has(c.idColor)) ?? [];

  return (
    <fieldset className="space-y-2">
      <legend className="font-title text-sm font-medium text-neutral-dark">Colores de fábrica</legend>
      <p className="font-sans text-xs text-neutral-medium">
        Colores propios del producto, aparte de los que salen de sus bases y acabados. Deben ser de la misma marca.
      </p>
      {elegidos.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {elegidos.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-2 rounded-full border border-neutral-light bg-neutral-white py-1 pl-2 pr-1 font-sans text-sm"
            >
              <Muestra hexadecimal={c.hexadecimal} etiqueta={`Muestra de ${c.nombre}`} />
              {c.nombre}
              <button
                type="button"
                aria-label={`Quitar ${c.nombre}`}
                onClick={() => onChange(elegidos.filter((x) => x.id !== c.id))}
                className="rounded-full p-1 text-neutral-medium hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Input
        label="Buscar color de la marca"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        disabled={idMarca === null}
        helperText={idMarca === null ? 'Elija primero la marca.' : 'Escriba al menos 2 letras del nombre o el código.'}
      />
      {candidatos.length > 0 && (
        <ul
          aria-label="Resultados"
          className="divide-y divide-neutral-light rounded-card border border-neutral-light bg-neutral-white"
        >
          {candidatos.map((c) => (
            <li key={c.idColor}>
              <button
                type="button"
                onClick={() => {
                  onChange([...elegidos, { id: c.idColor, nombre: c.nombre, hexadecimal: c.hexadecimal }]);
                  setBusqueda('');
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left font-sans text-sm hover:bg-neutral-lightest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50"
              >
                <Muestra hexadecimal={c.hexadecimal} etiqueta={`Muestra de ${c.nombre}`} />
                {c.nombre}
                <span className="text-xs text-neutral-medium">{c.acabado}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
};
