'use client';

import React, { useCallback } from 'react';
import Link from 'next/link';
import { Alert, ProductCard, Skeleton } from '@/core/components';
import { MedidorPatrocinio } from '@/modules/m14-patrocinios/components/MedidorPatrocinio';
import { busquedaApi } from '@/modules/m02-busqueda/services/busqueda-api';
import { PRODUCTOS_RECOMENDADOS_MAXIMO, type ColorPaleta } from '../../dtos/m01-catalogo-paleta.dto';
import { precioVisible } from '../../services/ofertas-visuales';
import { useCargar } from '../../services/useCargarPaleta';
import { ComplementariosProducto } from '../publico/ComplementariosProducto';

export interface ProductosDelColorProps {
  color: ColorPaleta | null;
  /** Id de la sección, para que la onda baje hasta aquí (P15). */
  id: string;
}

/**
 * Productos del color y productos recomendados (contrato M01 · P9, P10). Los del color son los que se entregan en el color
 * elegido, tal como los devuelve M02 (con sus ofertas y la etiqueta «Patrocinado»); la tarjeta es la estándar del catálogo,
 * así que seguirá la que M01 defina para «variante real con su color». Cada uno lleva a la ficha con el color puesto (P11).
 * Los recomendados son los que el sistema sugiere aparte de las pinturas (complementarios de los primeros productos del
 * color) para completar el trabajo.
 */
export const ProductosDelColor: React.FC<ProductosDelColorProps> = ({ color, id }) => {
  const idColor = color?.idColor ?? null;
  const productos = useCargar(
    useCallback(
      () => (idColor === null ? Promise.resolve(null) : busquedaApi.productos({ idColor: [idColor], limite: PRODUCTOS_RECOMENDADOS_MAXIMO })),
      [idColor],
    ),
    'No se pudieron cargar los productos de este color.',
  );
  const items = productos.datos?.items ?? [];
  const ids = items.slice(0, 3).map((p) => p.idProducto);
  const primero = ids[0] ?? null;

  return (
    <>
      <section id={id} tabIndex={-1} aria-labelledby="titulo-productos-color" className="scroll-mt-32 space-y-4 focus:outline-none">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="titulo-productos-color" className="font-title text-2xl font-bold text-corporate">
              {color === null ? 'Productos en este color' : `Productos en ${color.nombre}`}
            </h2>
            <p className="font-sans text-sm text-neutral-medium">
              {color === null ? (
                'Elige un color en el abanico para ver los productos que se entregan en él.'
              ) : (
                <>
                  Se entregan en <strong className="text-neutral-black">{color.nombre}</strong>
                  {color.familia === null ? '' : ` · ${color.familia}`}. Los colores son referenciales y pueden variar según tu pantalla.
                </>
              )}
            </p>
          </div>
          {color !== null && (
            <Link href={`/productos?idColor=${color.idColor}`} className="font-sans text-sm font-semibold text-conversion-hover hover:underline">
              Ver todos →
            </Link>
          )}
        </div>

        {productos.error !== null && <Alert variant="error">{productos.error}</Alert>}
        {color !== null && productos.cargando && productos.datos === null && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-72 w-full" />
            ))}
          </div>
        )}
        {color !== null && !productos.cargando && productos.error === null && items.length === 0 && (
          <p className="rounded-card border border-dashed border-neutral-light bg-neutral-lightest px-4 py-8 text-center font-sans text-sm text-neutral-medium">
            Todavía no hay productos disponibles en este color.
          </p>
        )}
        {items.length > 0 && (
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
            {items.map((p) => (
              <li key={p.idProducto} className="flex">
                <MedidorPatrocinio idCampania={p.patrocinado ? p.idCampania : null} ubicacion="listado" className="flex w-full">
                  <ProductCard
                    id={String(p.idProducto)}
                    name={p.nombre}
                    brand={p.marca}
                    description={`${p.esCombo ? 'Combo · ' : ''}${p.subcategoria}${p.precioDesde === null ? '' : ' · Precio desde'}${p.disponibilidad === 'agotado' ? ' · Agotado por ahora' : ''}`}
                    {...precioVisible(p.precioDesde, p.oferta)}
                    isSponsored={p.patrocinado}
                    href={`/productos/${p.idProducto}${color === null ? '' : `?color=${color.idColor}`}`}
                    {...(p.idImagenPrincipal === null ? {} : { imageUrl: busquedaApi.urlImagen(p.idImagenPrincipal, 'miniatura') })}
                    className="w-full"
                  />
                </MedidorPatrocinio>
              </li>
            ))}
          </ul>
        )}
      </section>
      {primero !== null && <ComplementariosProducto idProducto={primero} tambienDe={ids.slice(1)} titulo="Recomendados para tu proyecto" />}
    </>
  );
};
