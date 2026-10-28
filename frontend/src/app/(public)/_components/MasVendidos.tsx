'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { SeccionOnda } from '@/core/components';
import { FilaProductos, FilaProductosCargando, useProductosFila } from './FilaProductos';

/**
 * «Los más vendidos»: banda azul con olas, una sola fila. Sale de las ventas reales de M08 de los últimos
 * 90 días (M02 · `ordenar=mas_vendidos`). Sin ventas todavía, o si la consulta falla, la banda
 * entera no se pinta.
 */
export function MasVendidos() {
  const filtros = useMemo(() => ({ ordenar: 'mas_vendidos' as const, conVentas: true, limite: 12 }), []);
  const productos = useProductosFila(filtros);

  if (productos !== null && productos.length === 0) return null;

  return (
    <SeccionOnda tituloId="titulo-mas-vendidos">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="titulo-mas-vendidos" className="font-title text-2xl font-bold">
            Los más vendidos
          </h2>
          <p className="font-sans text-sm text-neutral-white/80">Lo que más se llevan nuestros clientes en los últimos meses</p>
        </div>
        <Link
          href="/productos?ordenar=mas_vendidos"
          className="inline-flex min-h-[44px] items-center gap-1 rounded-btn font-sans text-sm font-medium text-neutral-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-white/80"
        >
          Ver más
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      {productos === null ? <FilaProductosCargando /> : <FilaProductos ariaLabel="Los más vendidos" productos={productos} />}
    </SeccionOnda>
  );
}
