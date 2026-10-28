'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { catalogoPublicoApi } from '@/modules/m01-catalogo/services/consulta-publica-api';
import { FilaProductos, FilaProductosCargando, useProductosFila } from './FilaProductos';

/** La categoría de las pinturas (en el catálogo real se llama «Pinturas»). */
const ES_PINTURA = /^pintura/i;

/**
 * «Herramientas y más para tu obra»: productos de las categorías que NO son pinturas (herramientas, accesorios,
 * estucos, solventes…), en una sola fila. Las categorías salen del catálogo real; si no hay ninguna, o no hay productos,
 * la sección no se pinta.
 */
export function OtrosProductos() {
  const [idsCategoria, setIdsCategoria] = useState<ReadonlyArray<number> | null>(null);

  useEffect(() => {
    let activo = true;
    catalogoPublicoApi
      .categorias()
      .then((lista) => {
        if (activo) setIdsCategoria(lista.filter((c) => !ES_PINTURA.test(c.nombre.trim())).map((c) => c.idCategoria));
      })
      .catch(() => {
        if (activo) setIdsCategoria([]);
      });
    return () => {
      activo = false;
    };
  }, []);

  const filtros = useMemo(
    () => (idsCategoria === null || idsCategoria.length === 0 ? null : { idCategoria: [...idsCategoria], ordenar: 'novedad' as const, limite: 12 }),
    [idsCategoria],
  );
  const productos = useProductosFila(filtros);

  if (idsCategoria !== null && idsCategoria.length === 0) return null;
  if (productos !== null && productos.length === 0) return null;

  return (
    <section aria-labelledby="titulo-otros-productos">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="titulo-otros-productos" className="font-title text-xl font-semibold text-neutral-black">
            Herramientas y más para tu obra
          </h2>
          <p className="font-sans text-sm text-neutral-medium">Brochas, rodillos, estucos, solventes y accesorios para terminar el trabajo</p>
        </div>
        <Link
          href="/productos"
          className="inline-flex min-h-[44px] items-center gap-1 rounded-btn font-sans text-sm font-medium text-conversion-hover hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50"
        >
          Ver todos
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      {productos === null ? <FilaProductosCargando /> : <FilaProductos ariaLabel="Herramientas y más para tu obra" productos={productos} />}
    </section>
  );
}
