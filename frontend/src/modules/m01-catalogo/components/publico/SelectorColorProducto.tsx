'use client';

import React, { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Palette } from 'lucide-react';
import { Alert, Button, Input, Modal } from '@/core/components';
import type { ColorOfrecido } from '../../dtos/m01-catalogo-productos.dto';
import { useCargar, useRetardo } from '../../hooks/useCargar';
import { catalogoPublicoApi } from '../../services/consulta-publica-api';

const POR_PAGINA = 60;

export interface ModalColoresProductoProps {
  idProducto: number;
  elegido: ColorOfrecido | null;
  onElegir: (color: ColorOfrecido) => void;
  onClose: () => void;
}

/**
 * Carta de colores del producto en una ventana: las familias son pestañas, hay buscador por nombre o
 * código y los colores se muestran como cuadros pequeños. Nunca se descarga la carta completa: cada
 * página se pide bajo demanda.
 */
export const ModalColoresProducto: React.FC<ModalColoresProductoProps> = ({
  idProducto,
  elegido,
  onElegir,
  onClose,
}) => {
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
  const pestanas = useRef<Array<HTMLButtonElement | null>>([]);

  // "Ver más" acumula páginas; la primera página (otra familia o búsqueda) reemplaza lo anterior.
  useEffect(() => {
    if (datos === null) return;
    setAcumulados((previos) =>
      pagina === 1
        ? datos.items
        : [...previos, ...datos.items.filter((n) => !previos.some((c) => c.idColor === n.idColor))],
    );
  }, [datos, pagina]);

  const familias = datos?.familias ?? [];
  const opciones: Array<{ id: number | null; nombre: string; hexadecimal: string | null }> = [
    { id: null, nombre: 'Todos', hexadecimal: null },
    ...familias.map((f) => ({ id: f.idFamiliaColor, nombre: f.nombre, hexadecimal: f.hexadecimal })),
  ];
  const hayMas = datos !== null && pagina < datos.paginacion.totalPaginas;

  const elegirFamilia = (id: number | null) => {
    setIdFamilia(id);
    setPagina(1);
  };

  const alPulsarPestana = (indice: number, e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const destino = (indice + (e.key === 'ArrowRight' ? 1 : -1) + opciones.length) % opciones.length;
    const opcion = opciones[destino];
    if (opcion === undefined) return;
    elegirFamilia(opcion.id);
    pestanas.current[destino]?.focus();
  };

  return (
    <Modal isOpen onClose={onClose} title="Colores" subtitle="Elija el color para su producto." size="xl">
      <div className="space-y-4 py-2">
        <Input
          label="Buscar por nombre o código"
          type="search"
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value);
            setPagina(1);
          }}
        />

        {error !== null && <Alert variant="error">{error}</Alert>}

        <div role="tablist" aria-label="Familias de color" className="flex gap-2 overflow-x-auto pb-1">
          {opciones.map((o, indice) => {
            const activa = o.id === idFamilia;
            return (
              <button
                key={o.id ?? 'todos'}
                ref={(el) => {
                  pestanas.current[indice] = el;
                }}
                type="button"
                role="tab"
                id={`pestana-familia-${o.id ?? 'todos'}`}
                aria-selected={activa}
                aria-controls="panel-colores"
                tabIndex={activa ? 0 : -1}
                onClick={() => elegirFamilia(o.id)}
                onKeyDown={(e) => alPulsarPestana(indice, e)}
                className={`flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 font-title text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50 ${
                  activa
                    ? 'border-action bg-subaction text-corporate'
                    : 'border-neutral-light bg-neutral-white text-neutral-dark hover:border-neutral-medium'
                }`}
              >
                {o.hexadecimal !== null && (
                  <span
                    className="h-4 w-4 rounded-full border border-neutral-light"
                    style={{ backgroundColor: o.hexadecimal }}
                    aria-hidden="true"
                  />
                )}
                {o.nombre}
              </button>
            );
          })}
        </div>

        <div
          id="panel-colores"
          role="tabpanel"
          aria-labelledby={`pestana-familia-${idFamilia ?? 'todos'}`}
          className="min-h-40"
        >
          {cargando && datos === null && <p className="font-sans text-sm text-neutral-medium">Cargando colores…</p>}
          {datos !== null && acumulados.length === 0 && (
            <p className="font-sans text-sm text-neutral-medium">No hay colores con ese criterio.</p>
          )}
          <ul
            className="grid grid-cols-[repeat(auto-fill,minmax(4.25rem,1fr))] gap-1.5"
            aria-label="Colores disponibles"
          >
            {acumulados.map((c) => {
              const activo = elegido?.idColor === c.idColor;
              return (
                <li key={c.idColor}>
                  <button
                    type="button"
                    aria-pressed={activo}
                    aria-label={`${c.nombre}${c.codigo === null ? '' : `, código ${c.codigo}`}`}
                    title={`${c.nombre}${c.codigo === null ? '' : ` · ${c.codigo}`}`}
                    onClick={() => {
                      onElegir(c);
                      onClose();
                    }}
                    className={`block w-full overflow-hidden rounded-input border-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50 ${
                      activo ? 'border-action' : 'border-neutral-light hover:border-neutral-medium'
                    }`}
                  >
                    <span className="block h-12" style={{ backgroundColor: c.hexadecimal }} aria-hidden="true" />
                    <span className="block truncate bg-neutral-white px-1 py-0.5 font-sans text-[10px] text-neutral-dark">
                      {c.nombre}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {hayMas && (
            <div className="pt-3">
              <Button variant="outline" size="sm" isLoading={cargando} onClick={() => setPagina((p) => p + 1)}>
                Ver más colores
              </Button>
            </div>
          )}
        </div>
        <p className="font-sans text-xs text-neutral-medium">
          *Los colores mostrados son referenciales y pueden variar según la pantalla.
        </p>
      </div>
    </Modal>
  );
};

export interface ColorProductoProps {
  idProducto: number;
  elegido: ColorOfrecido | null;
  onElegir: (color: ColorOfrecido) => void;
}

/** Muestra solo el color elegido y el botón que abre la carta completa. */
export const ColorProducto: React.FC<ColorProductoProps> = ({ idProducto, elegido, onElegir }) => {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="space-y-2">
      <p className="font-title text-sm font-medium text-neutral-dark">Color</p>
      <div className="flex items-center gap-3 rounded-card border border-neutral-light bg-neutral-white p-3">
        {elegido === null ? (
          <span
            className="h-14 w-14 shrink-0 rounded-input border border-dashed border-neutral-medium"
            aria-hidden="true"
          />
        ) : (
          <span
            role="img"
            aria-label={`Muestra de ${elegido.nombre}`}
            className="h-14 w-14 shrink-0 rounded-input border border-neutral-light"
            style={{ backgroundColor: elegido.hexadecimal }}
          />
        )}
        <div className="min-w-0 flex-1" role="status">
          <p className="truncate font-title text-sm font-semibold text-neutral-black">
            {elegido?.nombre ?? 'Aún no ha elegido un color'}
          </p>
          {elegido !== null && (
            <p className="truncate font-sans text-xs text-neutral-medium">
              {elegido.codigo !== null && `Código ${elegido.codigo} · `}
              {elegido.acabado}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          leftIcon={<Palette className="h-4 w-4" aria-hidden="true" />}
          onClick={() => setAbierto(true)}
        >
          {elegido === null ? 'Ver colores' : 'Cambiar color'}
        </Button>
      </div>
      {abierto && (
        <ModalColoresProducto
          idProducto={idProducto}
          elegido={elegido}
          onElegir={onElegir}
          onClose={() => setAbierto(false)}
        />
      )}
    </div>
  );
};
