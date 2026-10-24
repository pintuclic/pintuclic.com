'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Input } from '@/core/components';
import type { ColorOfrecido } from '../../dtos/m01-catalogo-productos.dto';
import { useCargar, useRetardo } from '../../hooks/useCargar';
import { catalogoPublicoApi } from '../../services/consulta-publica-api';
import { Muestra } from '../admin/comunes';

export interface SelectorColorProductoProps {
  idProducto: number;
  elegido: ColorOfrecido | null;
  onElegir: (color: ColorOfrecido | null) => void;
}

const POR_PAGINA = 36;

/**
 * Selector de color de la ficha (U3, U4): se navega por familia y se busca por nombre o código.
 * Nunca se descarga la carta completa: cada página de swatches se pide bajo demanda.
 */
export const SelectorColorProducto: React.FC<SelectorColorProductoProps> = ({ idProducto, elegido, onElegir }) => {
  const [busqueda, setBusqueda] = useState('');
  const [idFamilia, setIdFamilia] = useState<number | null>(null);
  const [pagina, setPagina] = useState(1);
  const termino = useRetardo(busqueda);
  const cargador = useCallback(
    () =>
      catalogoPublicoApi.colores(idProducto, {
        busqueda: termino,
        idFamiliaColor: idFamilia ?? undefined,
        pagina,
        limite: POR_PAGINA,
      }),
    [idProducto, termino, idFamilia, pagina],
  );
  const { datos, cargando, error } = useCargar(cargador, 'No se pudieron cargar los colores.');
  const [acumulados, setAcumulados] = useState<ColorOfrecido[]>([]);

  // "Ver más" acumula páginas; la primera página (nuevo filtro o búsqueda) reemplaza lo anterior.
  useEffect(() => {
    if (datos === null) return;
    setAcumulados((previos) =>
      pagina === 1
        ? datos.items
        : [...previos, ...datos.items.filter((n) => !previos.some((c) => c.idColor === n.idColor))],
    );
  }, [datos, pagina]);
  const lista = acumulados;
  const hayMas = datos !== null && pagina < datos.paginacion.totalPaginas;

  const elegirFamilia = (id: number | null) => {
    setIdFamilia(id);
    setPagina(1);
  };

  return (
    <fieldset className="space-y-3">
      <legend className="font-title text-sm font-medium text-neutral-dark">
        Color
        {elegido !== null && <span className="ml-2 font-sans font-normal text-neutral-medium">{elegido.nombre}</span>}
      </legend>

      {error !== null && <Alert variant="error">{error}</Alert>}

      {datos !== null && datos.familias.length > 1 && (
        <div role="group" aria-label="Familias de color" className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={idFamilia === null}
            onClick={() => elegirFamilia(null)}
            className={`min-h-11 rounded-full border px-3 font-sans text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50 ${
              idFamilia === null
                ? 'border-action bg-subaction text-corporate'
                : 'border-neutral-light bg-neutral-white text-neutral-dark'
            }`}
          >
            Todos
          </button>
          {datos.familias.map((f) => (
            <button
              key={f.idFamiliaColor}
              type="button"
              aria-pressed={idFamilia === f.idFamiliaColor}
              onClick={() => elegirFamilia(f.idFamiliaColor)}
              className={`flex min-h-11 items-center gap-2 rounded-full border px-3 font-sans text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50 ${
                idFamilia === f.idFamiliaColor
                  ? 'border-action bg-subaction text-corporate'
                  : 'border-neutral-light bg-neutral-white text-neutral-dark'
              }`}
            >
              <Muestra hexadecimal={f.hexadecimal} etiqueta={`Familia ${f.nombre}`} />
              {f.nombre} <span className="text-neutral-medium">({f.total})</span>
            </button>
          ))}
        </div>
      )}

      <Input
        label="Buscar color por nombre o código"
        type="search"
        value={busqueda}
        onChange={(e) => {
          setBusqueda(e.target.value);
          setPagina(1);
        }}
      />

      {datos !== null && lista.length === 0 && (
        <p className="font-sans text-sm text-neutral-medium">No hay colores con ese criterio.</p>
      )}
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(3.25rem,1fr))] gap-2" aria-label="Colores disponibles">
        {lista.map((c) => {
          const activo = elegido?.idColor === c.idColor;
          return (
            <li key={c.idColor}>
              <button
                type="button"
                aria-pressed={activo}
                aria-label={`${c.nombre}${c.codigo === null ? '' : `, código ${c.codigo}`}${c.acabado === '' ? '' : `, acabado ${c.acabado}`}`}
                title={`${c.nombre}${c.codigo === null ? '' : ` · ${c.codigo}`}`}
                onClick={() => onElegir(activo ? null : c)}
                className={`flex h-12 w-full items-center justify-center rounded-full border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50 ${
                  activo ? 'border-action' : 'border-neutral-light hover:border-neutral-medium'
                }`}
              >
                <span
                  className="block h-9 w-9 rounded-full border border-neutral-light"
                  style={{ backgroundColor: c.hexadecimal }}
                  aria-hidden="true"
                />
              </button>
            </li>
          );
        })}
      </ul>
      {cargando && datos === null && <p className="font-sans text-sm text-neutral-medium">Cargando colores…</p>}
      {hayMas && (
        <Button variant="outline" size="sm" isLoading={cargando} onClick={() => setPagina((p) => p + 1)}>
          Ver más colores
        </Button>
      )}
      <p className="font-sans text-xs text-neutral-medium">
        *Los colores mostrados son referenciales y pueden variar según la pantalla.
      </p>
    </fieldset>
  );
};
