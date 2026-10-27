'use client';

import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { esColorMuyClaro } from '@/core/utils/color-muestra';

export interface ImagenGaleria {
  idImagen: number;
  /** Versión mediana, para la imagen grande. */
  url: string;
  /** Miniatura, para la tira de abajo (I7). */
  urlMiniatura: string;
}

export interface GaleriaProductoProps {
  nombre: string;
  imagenes: readonly ImagenGaleria[];
  /** Si cambia, la galería salta a esa imagen (la del color o la presentación elegidos). */
  idImagenEnfocada?: number | null;
  /** Imagen de la medida elegida (por ejemplo la silueta del envase): se muestra en una esquina. */
  imagenMedidaUrl: string | null;
  nombreMedida: string | null;
  /** Color elegido: la imagen se ve sobre una pared pintada de ese color, con su nombre y código (U8). */
  color?: { nombre: string; codigo: string | null; hexadecimal: string } | null;
}

/** Carrusel de imágenes del producto con miniaturas; la primera es la portada. */
export const GaleriaProducto: React.FC<GaleriaProductoProps> = ({
  nombre,
  imagenes,
  idImagenEnfocada = null,
  imagenMedidaUrl,
  nombreMedida,
  color = null,
}) => {
  const [indice, setIndice] = useState(0);
  const total = imagenes.length;

  useEffect(() => {
    if (indice >= total) setIndice(0);
  }, [indice, total]);

  useEffect(() => {
    if (idImagenEnfocada === null) return;
    const destino = imagenes.findIndex((i) => i.idImagen === idImagenEnfocada);
    if (destino !== -1) setIndice(destino);
  }, [idImagenEnfocada, imagenes]);

  const ir = (paso: number) => setIndice((i) => (total === 0 ? 0 : (i + paso + total) % total));
  const actual = imagenes[indice];

  return (
    <section aria-label={`Imágenes de ${nombre}`} aria-roledescription="carrusel" className="space-y-3">
      <div
        className="relative flex min-h-80 items-end justify-center overflow-hidden rounded-card bg-neutral-lightest p-6 transition-colors duration-500 sm:min-h-[28rem]"
        // El color es un dato del catálogo, no del tema: por eso va en `style`.
        style={color === null ? undefined : { backgroundColor: color.hexadecimal }}
        data-color-pared={color?.hexadecimal}
      >
        {color !== null && (
          <>
            {/* Piso claro bajo la pared pintada: el envase queda "parado" frente al color. */}
            <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/5 bg-neutral-white/75" />
            <p
              className={`absolute left-4 top-4 z-10 rounded-input bg-neutral-white/90 px-3 py-1.5 font-title text-sm font-semibold text-neutral-black shadow-card ${
                esColorMuyClaro(color.hexadecimal) ? 'ring-1 ring-neutral-light' : ''
              }`}
            >
              {color.nombre}
              {color.codigo !== null && (
                <span className="block font-sans text-xs font-normal text-neutral-medium">{color.codigo}</span>
              )}
            </p>
          </>
        )}
        {actual === undefined ? (
          <p className="relative self-center font-sans text-sm text-neutral-medium">Este producto aún no tiene imágenes.</p>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={actual.url}
            alt={`${nombre}, imagen ${indice + 1} de ${total}`}
            className={`relative max-h-96 w-full object-contain ${
              color === null ? 'self-center mix-blend-multiply' : 'drop-shadow-xl'
            }`}
          />
        )}
        {total > 1 && (
          <>
            <button
              type="button"
              aria-label="Imagen anterior"
              onClick={() => ir(-1)}
              className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-neutral-white/90 shadow-card hover:bg-neutral-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Imagen siguiente"
              onClick={() => ir(1)}
              className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-neutral-white/90 shadow-card hover:bg-neutral-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </>
        )}
        {imagenMedidaUrl !== null && (
          <div className="absolute bottom-3 right-3 rounded-input border border-neutral-light bg-neutral-white/95 p-1 shadow-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagenMedidaUrl}
              alt={nombreMedida === null ? 'Presentación elegida' : `Presentación ${nombreMedida}`}
              className="h-16 w-16 object-contain"
            />
          </div>
        )}
      </div>
      {total > 1 && (
        <ul className="flex gap-2 overflow-x-auto pb-1" aria-label="Miniaturas">
          {imagenes.map((imagen, i) => (
            <li key={imagen.idImagen} className="shrink-0">
              <button
                type="button"
                aria-label={`Ver imagen ${i + 1}`}
                aria-current={i === indice ? 'true' : undefined}
                onClick={() => setIndice(i)}
                className={`h-16 w-16 overflow-hidden rounded-input border-2 bg-neutral-lightest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50 ${
                  i === indice ? 'border-action' : 'border-neutral-light hover:border-neutral-medium'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagen.urlMiniatura} alt="" className="h-full w-full object-contain" loading="lazy" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
