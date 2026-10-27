'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { Alert, Skeleton } from '@/core/components';
import type { ProductoCalculable } from '../../interfaces/asesoria.interface';
import { listarProductosCalculables } from '../../services/asesoria-api';
import { mensajeDeError } from '../../services/mensaje-error';

/** Espera antes de consultar, para no pedir una vez por tecla. */
const ESPERA_ESCRITURA_MS = 300;
const RESULTADOS = 8;

export interface SelectorProductoCalculableProps {
  elegido: ProductoCalculable | null;
  onElegir: (producto: ProductoCalculable) => void;
}

/**
 * Selector de producto de la calculadora general (M03 · K10).
 *
 * Lleva buscador, como pide AGENTS.md para todo selector con más de unas pocas opciones,
 * pero busca EN EL SERVIDOR: la lista de productos con calculadora está paginada y no cabe
 * entera en la pantalla. Por eso no se reutiliza `SelectorBuscable` de M01, que filtra un
 * arreglo ya cargado.
 *
 * Solo ofrece productos que tienen calculadora: el endpoint ya los filtra (K1), así que
 * nunca se llega a un producto que luego responda que no la ofrece.
 */
export function SelectorProductoCalculable({ elegido, onElegir }: SelectorProductoCalculableProps) {
  const id = useId();
  const idLista = `${id}-lista`;
  const [texto, setTexto] = useState('');
  const [resultados, setResultados] = useState<ProductoCalculable[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [activa, setActiva] = useState(0);
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let vigente = true;
    const temporizador = setTimeout(() => {
      setBuscando(true);
      listarProductosCalculables({ q: texto, limite: RESULTADOS })
        .then((pagina) => {
          if (!vigente) return;
          setResultados(pagina.datos);
          setActiva(0);
          setError(null);
        })
        .catch((err: unknown) => {
          if (!vigente) return;
          setResultados([]);
          setError(mensajeDeError(err, 'No pudimos cargar los productos. Inténtalo de nuevo.'));
        })
        .finally(() => {
          if (vigente) setBuscando(false);
        });
    }, ESPERA_ESCRITURA_MS);

    return () => {
      vigente = false;
      clearTimeout(temporizador);
    };
  }, [texto]);

  useEffect(() => {
    if (!abierto) return;
    const cerrarFuera = (e: PointerEvent): void => {
      if (
        contenedor.current !== null &&
        e.target instanceof Node &&
        !contenedor.current.contains(e.target)
      ) {
        setAbierto(false);
      }
    };
    document.addEventListener('pointerdown', cerrarFuera);
    return () => document.removeEventListener('pointerdown', cerrarFuera);
  }, [abierto]);

  const elegir = (producto: ProductoCalculable): void => {
    onElegir(producto);
    setTexto('');
    setAbierto(false);
  };

  const alPulsar = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setAbierto(true);
      setActiva((i) => Math.min(i + 1, resultados.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiva((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && abierto) {
      e.preventDefault();
      const producto = resultados[activa];
      if (producto !== undefined) elegir(producto);
    } else if (e.key === 'Escape' && abierto) {
      e.stopPropagation();
      setAbierto(false);
    }
  };

  return (
    <div ref={contenedor} className="relative w-full">
      <label
        htmlFor={id}
        className="mb-1.5 block select-none font-title text-sm font-medium text-neutral-dark"
      >
        Producto
      </label>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-medium"
          aria-hidden="true"
        />
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={abierto}
          aria-controls={idLista}
          aria-autocomplete="list"
          autoComplete="off"
          value={texto}
          placeholder={elegido === null ? 'Busca una pintura por nombre o marca' : elegido.nombre}
          onChange={(e) => {
            setTexto(e.target.value);
            setAbierto(true);
          }}
          onFocus={() => setAbierto(true)}
          onKeyDown={alPulsar}
          className="w-full rounded-md border border-neutral-light bg-white py-2.5 pl-9 pr-3 font-sans text-sm text-neutral-dark transition-colors placeholder:text-neutral-medium focus:border-action focus:outline-none focus:ring-2 focus:ring-action/30"
        />
      </div>

      {elegido !== null && texto === '' && (
        <p className="mt-1.5 font-sans text-xs text-neutral-medium">
          Calculando con <span className="font-medium text-neutral-dark">{elegido.nombre}</span> de{' '}
          {elegido.marca}.
        </p>
      )}

      {abierto && (
        <ul
          id={idLista}
          role="listbox"
          aria-label="Productos con calculadora"
          className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-md border border-neutral-light bg-white py-1 shadow-lg"
        >
          {buscando && resultados.length === 0 && (
            <li className="px-3 py-2">
              <Skeleton className="h-5 w-40" />
            </li>
          )}

          {!buscando && resultados.length === 0 && error === null && (
            <li className="px-3 py-2 font-sans text-sm text-neutral-medium">
              Ninguna pintura coincide con lo que buscas.
            </li>
          )}

          {resultados.map((producto, indice) => (
            <li key={producto.idProducto} role="none">
              <button
                type="button"
                role="option"
                aria-selected={indice === activa}
                // Sin esto el lector de pantalla junta nombre y marca en una sola palabra.
                aria-label={`${producto.nombre}, ${producto.marca}`}
                onClick={() => elegir(producto)}
                onMouseEnter={() => setActiva(indice)}
                className={`block w-full px-3 py-2 text-left font-sans text-sm transition-colors ${
                  indice === activa
                    ? 'bg-action/10 text-neutral-dark'
                    : 'text-neutral-dark hover:bg-neutral-lightest'
                }`}
              >
                <span className="font-medium">{producto.nombre}</span>
                <span className="ml-2 text-neutral-medium">{producto.marca}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {error !== null && (
        <div className="mt-2">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
    </div>
  );
}
