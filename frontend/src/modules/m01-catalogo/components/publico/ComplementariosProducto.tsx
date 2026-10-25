'use client';

import React, { useEffect, useState } from 'react';
import { ProductCard } from '@/core/components';
import type { ProductoPublicoTarjeta } from '../../dtos/m01-catalogo-productos.dto';
import { catalogoPublicoApi } from '../../services/consulta-publica-api';

export interface ComplementariosProductoProps {
  idProducto: number;
}

/**
 * HU-CAT-08: hasta 4 productos que van bien con el consultado. Si no hay nada que sugerir, o la consulta
 * falla, la sección no se muestra: nunca debe estorbar a la ficha.
 */
export const ComplementariosProducto: React.FC<ComplementariosProductoProps> = ({ idProducto }) => {
  const [productos, setProductos] = useState<ProductoPublicoTarjeta[]>([]);

  useEffect(() => {
    let vigente = true;
    setProductos([]);
    catalogoPublicoApi
      .complementarios(idProducto)
      .then((lista) => vigente && setProductos(lista))
      .catch(() => vigente && setProductos([]));
    return () => {
      vigente = false;
    };
  }, [idProducto]);

  if (productos.length === 0) return null;
  return (
    <section aria-labelledby="titulo-complementarios" className="mt-12 space-y-4">
      <h2 id="titulo-complementarios" className="font-title text-xl font-bold text-corporate">
        Completa tu trabajo con
      </h2>
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {productos.map((p) => (
          <li key={p.idProducto} className="flex">
            <ProductCard
              id={String(p.idProducto)}
              name={p.nombre}
              brand={p.marca}
              description={`${p.esCombo ? 'Combo · ' : ''}${p.subcategoria}${p.precioDesde === null ? '' : ' · Precio desde'}`}
              price={p.precioDesde ?? 0}
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
