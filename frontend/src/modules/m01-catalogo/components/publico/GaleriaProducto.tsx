'use client';

import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface ImagenGaleria {
  idImagen: number;
  url: string;
}

export interface GaleriaProductoProps {
  nombre: string;
  imagenes: readonly ImagenGaleria[];
  /** Imagen de la medida elegida (por ejemplo la silueta del envase): se muestra en una esquina. */
  imagenMedidaUrl: string | null;
  nombreMedida: string | null;
}

/** Carrusel de imágenes del producto con miniaturas; la primera es la portada. */
export const GaleriaProducto: React.FC<GaleriaProductoProps> = ({
  nombre,
  imagenes,
  imagenMedidaUrl,
  nombreMedida,
}) => {
  const [indice, setIndice] = useState(0);
  const total = imagenes.length;

  useEffect(() => {
    if (indice >= total) setIndice(0);
  }, [indice, total]);

  const ir = (paso: number) => setIndice((i) => (total === 0 ? 0 : (i + paso + total) % total));
  const actual = imagenes[indice];

  return (
    <section aria-label={`Imágenes de ${nombre}`} aria-roledescription="carrusel" className="space-y-3">
      <div className="relative flex min-h-72 items-center justify-center overflow-hidden rounded-card bg-neutral-lightest p-4 sm:min-h-96">
        {actual === undefined ? (
          <p className="font-sans text-sm text-neutral-medium">Este producto aún no tiene imágenes.</p>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={actual.url}
            alt={`${nombre}, imagen ${indice + 1} de ${total}`}
            className="max-h-96 w-full object-contain mix-blend-multiply"
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
                <img src={imagen.url} alt="" className="h-full w-full object-contain" loading="lazy" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
