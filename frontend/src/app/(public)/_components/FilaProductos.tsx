'use client';

import { useEffect, useState } from 'react';
import { ProductCard, ScrollRow, Skeleton, type ProductCardProps } from '@/core/components';
import { busquedaApi } from '@/modules/m02-busqueda/services/busqueda-api';
import { useAgregarDesdeTarjeta } from '@/modules/m02-busqueda/hooks/useAgregarDesdeTarjeta';
import type { FiltrosBusqueda } from '@/modules/m02-busqueda/services/filtros-busqueda';
import { tarjetaDeResultado } from '@/modules/m02-busqueda/services/tarjeta-resultado';

/** Ancho de cada tarjeta de la fila: fijo, para que se vea un pedazo de la siguiente y se note que se desliza. */
const ANCHO_TARJETA = 'w-[15.5rem] sm:w-[17rem]';

/**
 * Productos del catálogo para una fila del inicio: `null` mientras carga y lista vacía si no hay o la consulta falla
 * (la fila entonces no se pinta; el inicio nunca queda con un error por esto). `filtros === null` espera a que el
 * llamador los tenga. Las tarjetas son las de /productos: el carrito agrega y abre el panel lateral.
 */
export function useProductosFila(filtros: Partial<FiltrosBusqueda> | null): ReadonlyArray<ProductCardProps> | null {
  const agregarDesdeTarjeta = useAgregarDesdeTarjeta();
  const [productos, setProductos] = useState<ReadonlyArray<ProductCardProps> | null>(null);

  useEffect(() => {
    if (filtros === null) return;
    let activo = true;
    busquedaApi
      .productos(filtros)
      .then((pagina) => {
        if (activo) setProductos(pagina.items.map((item) => tarjetaDeResultado(item, agregarDesdeTarjeta)));
      })
      .catch(() => {
        if (activo) setProductos([]);
      });
    return () => {
      activo = false;
    };
  }, [filtros, agregarDesdeTarjeta]);

  return productos;
}

/** Marcadores de las tarjetas mientras la fila carga. */
export function FilaProductosCargando() {
  return (
    <div className="flex gap-5 overflow-hidden px-1 pb-4 pt-1" aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className={`h-[24rem] shrink-0 rounded-card ${ANCHO_TARJETA}`} />
      ))}
    </div>
  );
}

/** Una sola fila de tarjetas que se desliza (flechas, dedo o teclado). */
export function FilaProductos({ ariaLabel, productos }: { ariaLabel: string; productos: ReadonlyArray<ProductCardProps> }) {
  return (
    <ScrollRow ariaLabel={ariaLabel}>
      {productos.map((producto) => (
        <div key={producto.id} className={`flex shrink-0 snap-start ${ANCHO_TARJETA}`}>
          <ProductCard {...producto} className="h-full w-full" />
        </div>
      ))}
    </ScrollRow>
  );
}
