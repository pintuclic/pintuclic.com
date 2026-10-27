'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge, Button } from '@/core/components';
import { formatCOP } from '@/core/utils/moneda';
import type { CotizacionDetalle, EstadoCotizacion } from '../dtos/m21-cotizaciones.dto';
import { ETIQUETA_ESTADO, FILTROS_ESTADO, VARIANTE_ESTADO } from '../services/textos-cotizaciones';

export function EstadoCotizacionBadge({ estado }: { estado: EstadoCotizacion }) {
  return <Badge variant={VARIANTE_ESTADO[estado]}>{ETIQUETA_ESTADO[estado]}</Badge>;
}

/** Filtros por estado como enlaces: el filtro viaja en la URL (`?estado=`). */
export function FiltrosEstado({ actual, enlace }: { actual: EstadoCotizacion | null; enlace: (e: EstadoCotizacion | null) => string }) {
  return (
    <nav aria-label="Filtrar por estado" className="flex flex-wrap gap-2">
      {FILTROS_ESTADO.map((f) => {
        const activo = f.valor === actual;
        return (
          <Link
            key={f.etiqueta}
            href={enlace(f.valor)}
            aria-current={activo ? 'page' : undefined}
            className={`inline-flex min-h-9 items-center rounded-full border px-3 font-title text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50 ${
              activo
                ? 'border-action bg-action text-neutral-white'
                : 'border-neutral-light bg-neutral-white text-neutral-dark hover:border-action hover:text-action'
            }`}
          >
            {f.etiqueta}
          </Link>
        );
      })}
    </nav>
  );
}

export function Paginacion({ pagina, totalPaginas, onCambiar }: { pagina: number; totalPaginas: number; onCambiar: (p: number) => void }) {
  if (totalPaginas <= 1) return null;
  return (
    <nav aria-label="Páginas" className="flex items-center justify-center gap-3">
      <Button variant="outline" size="sm" disabled={pagina <= 1} onClick={() => onCambiar(pagina - 1)} leftIcon={<ChevronLeft aria-hidden className="h-4 w-4" />}>
        Anterior
      </Button>
      <span className="text-sm text-neutral-dark">
        Página {pagina} de {totalPaginas}
      </span>
      <Button variant="outline" size="sm" disabled={pagina >= totalPaginas} onClick={() => onCambiar(pagina + 1)} rightIcon={<ChevronRight aria-hidden className="h-4 w-4" />}>
        Siguiente
      </Button>
    </nav>
  );
}

/** Tabla de solo lectura de las líneas: referencia, precio acordado y subtotal. */
export function TablaLineas({ cotizacion }: { cotizacion: CotizacionDetalle }) {
  return (
    <div className="overflow-x-auto rounded-card border border-neutral-light bg-neutral-white">
      <table className="w-full min-w-[640px] text-sm">
        <caption className="sr-only">Productos de la cotización {cotizacion.codigo}</caption>
        <thead className="bg-neutral-lightest text-left text-xs uppercase tracking-wide text-neutral-medium">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">Producto</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">Cantidad</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">Precio de referencia</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">Precio acordado</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">Subtotal</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-light">
          {cotizacion.lineas.map((l) => (
            <tr key={l.idLinea}>
              <td className="px-4 py-3">
                <p className="font-semibold text-neutral-black">{l.producto.nombre}</p>
                <p className="flex flex-wrap items-center gap-x-2 text-xs text-neutral-medium">
                  {[l.producto.marca, l.producto.medida].filter((v) => v !== null).join(' · ')}
                  {l.producto.color !== null && (
                    <span className="inline-flex items-center gap-1">
                      <span aria-hidden className="inline-block h-3 w-3 rounded-full border border-neutral-medium/40" style={{ backgroundColor: l.producto.color.hexadecimal }} />
                      {l.producto.color.nombre}
                    </span>
                  )}
                </p>
              </td>
              <td className="px-4 py-3 text-right text-neutral-black">{l.cantidad}</td>
              <td className="px-4 py-3 text-right text-neutral-medium">{formatCOP(l.precioReferencia)}</td>
              <td className="px-4 py-3 text-right font-semibold text-neutral-black">
                {l.precioAcordado === null ? '—' : formatCOP(l.precioAcordado)}
              </td>
              <td className="px-4 py-3 text-right font-semibold text-neutral-black">
                {l.subtotalAcordado === null ? '—' : formatCOP(l.subtotalAcordado)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Totales: la referencia (lo que costaba en el carrito) y el acordado si ya lo hay. */
export function Totales({ cotizacion }: { cotizacion: CotizacionDetalle }) {
  // Con las líneas a la vista, la referencia se suma de ellas (sirve también para cotizaciones anteriores a M21).
  const referencia =
    cotizacion.lineas.length > 0
      ? Math.round(cotizacion.lineas.reduce((s, l) => s + l.precioReferencia * l.cantidad, 0) * 100) / 100
      : cotizacion.totalReferencia;
  const ahorro = cotizacion.totalAcordado === null ? 0 : referencia - cotizacion.totalAcordado;
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between gap-4">
        <dt className="text-neutral-dark">Total con precios del carrito</dt>
        <dd className={cotizacion.totalAcordado === null ? 'font-semibold text-neutral-black' : 'text-neutral-medium line-through'}>
          {formatCOP(referencia)}
        </dd>
      </div>
      {cotizacion.totalAcordado !== null && (
        <>
          <div className="flex items-baseline justify-between gap-4 border-t border-neutral-light pt-2">
            <dt className="font-title font-bold text-neutral-black">Total acordado</dt>
            <dd className="font-title text-2xl font-bold text-corporate">{formatCOP(cotizacion.totalAcordado)}</dd>
          </div>
          {ahorro > 0 && <p className="text-right text-sm font-medium text-conversion-hover">Ahorras {formatCOP(ahorro)}</p>}
        </>
      )}
      <p className="text-xs text-neutral-medium">Precios con IVA incluido. El envío se calcula al finalizar la compra.</p>
    </dl>
  );
}
