'use client';

import React, { useEffect, useState } from 'react';
import { ProductCard } from '@/core/components';
import type { ProductoPatrocinado } from '../dtos/m14-patrocinios.dto';
import { catalogoPublicoApi } from '@/modules/m01-catalogo/services/consulta-publica-api';
import { precioVisible } from '@/modules/m01-catalogo/services/ofertas-visuales';
import { patrociniosPublicoApi } from '../services/patrocinios-api';

/** Cuántas tarjetas caben en una fila del bloque del inicio. */
const TARJETAS = 5;

/**
 * Bloque «Productos patrocinados» de la página de inicio (contrato M14 · A10). Si no hay campañas vigentes, o la consulta
 * falla, no se pinta nada: el inicio nunca debe quedar con un hueco ni con un error por esto.
 */
export const ProductosPatrocinados: React.FC = () => {
  const [productos, setProductos] = useState<ProductoPatrocinado[]>([]);

  useEffect(() => {
    let vigente = true;
    patrociniosPublicoApi
      .productosDelInicio(TARJETAS)
      .then((lista) => vigente && setProductos(lista))
      .catch(() => vigente && setProductos([]));
    return () => {
      vigente = false;
    };
  }, []);

  if (productos.length === 0) return null;
  return (
    <section aria-labelledby="titulo-productos-patrocinados" className="space-y-4">
      <h2 id="titulo-productos-patrocinados" className="font-title text-2xl font-bold text-corporate">
        Productos patrocinados
      </h2>
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {productos.map((p) => (
          <li key={p.idProducto} className="flex">
            <ProductCard
              id={String(p.idProducto)}
              name={p.nombre}
              brand={p.marca}
              description={`${p.esCombo ? 'Combo · ' : ''}${p.subcategoria}${p.precioDesde === null ? '' : ' · Precio desde'}`}
              {...precioVisible(p.precioDesde, p.oferta)}
              isSponsored
              href={`/productos/${p.idProducto}`}
              {...(p.idImagenPrincipal === null
                ? {}
                : { imageUrl: catalogoPublicoApi.urlImagen(p.idImagenPrincipal, 'miniatura') })}
              className="w-full"
            />
          </li>
        ))}
      </ul>
    </section>
  );
};
