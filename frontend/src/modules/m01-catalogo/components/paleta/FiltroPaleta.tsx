'use client';

import React from 'react';
import { Button, Input, Select } from '@/core/components';
import type { FamiliaPaleta, MarcaPaleta } from '../../dtos/m01-catalogo-paleta.dto';

export interface FiltroPaletaProps {
  /** El título de la página, que comparte la primera fila con la búsqueda para dejarle el alto al abanico. */
  titulo: React.ReactNode;
  familias: readonly FamiliaPaleta[];
  marcas: readonly MarcaPaleta[];
  familia: number | null;
  idMarca: number | null;
  texto: string;
  onFamilia: (id: number | null) => void;
  onMarca: (id: number | null) => void;
  onTexto: (texto: string) => void;
}

/**
 * El filtro de la paleta (contrato M01 · P2, P3): pestañas de familia (cada una con su muestra y cuántos colores trae),
 * marca y búsqueda por nombre o código. Elegir una no vacía las demás.
 */
export const FiltroPaleta: React.FC<FiltroPaletaProps> = ({ titulo, familias, marcas, familia, idMarca, texto, onFamilia, onMarca, onTexto }) => (
  <div className="space-y-2">
    <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
      <div className="min-w-0">{titulo}</div>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_200px] lg:w-[540px] lg:shrink-0">
        <Input label="Buscar color" placeholder="Nombre o código del color" value={texto} onChange={(e) => onTexto(e.target.value)} />
        <Select
          label="Marca"
          value={idMarca === null ? '' : String(idMarca)}
          onChange={(e) => onMarca(e.target.value === '' ? null : Number(e.target.value))}
          options={[{ value: '', label: 'Todas las marcas' }, ...marcas.map((m) => ({ value: String(m.idMarca), label: `${m.nombre} (${m.total})` }))]}
        />
      </div>
    </div>
    <div role="group" aria-label="Filtrar por familia de color" className="flex gap-2 overflow-x-auto pb-1">
      <Button variant="selection" selected={familia === null} aria-pressed={familia === null} size="sm" onClick={() => onFamilia(null)} className="shrink-0">
        Todas
      </Button>
      {familias.map((f) => (
        <Button
          key={f.idFamiliaColor}
          variant="selection"
          selected={familia === f.idFamiliaColor}
          aria-pressed={familia === f.idFamiliaColor}
          size="sm"
          onClick={() => onFamilia(f.idFamiliaColor)}
          className="shrink-0"
          leftIcon={<span aria-hidden="true" className="h-3.5 w-3.5 rounded-full border border-neutral-light" style={{ background: f.hexadecimal }} />}
        >
          {f.nombre}
          <span className="ml-1 font-sans text-[11px] font-normal text-neutral-medium">{f.total}</span>
        </Button>
      ))}
    </div>
  </div>
);
