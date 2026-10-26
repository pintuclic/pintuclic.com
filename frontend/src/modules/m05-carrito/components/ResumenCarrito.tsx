'use client';

import { formatCOP } from '@/core/utils/moneda';
import type { ResumenCalculo } from '@/modules/m06-precios/dtos/m06-precios.dto';

export interface ResumenCarritoProps {
  resumen: ResumenCalculo;
}

function Fila({ etiqueta, valor, descuento = false }: { etiqueta: string; valor: number; descuento?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-neutral-dark">{etiqueta}</dt>
      <dd className={descuento ? 'text-conversion-hover' : 'text-neutral-black'}>
        {descuento ? `−${formatCOP(valor)}` : formatCOP(valor)}
      </dd>
    </div>
  );
}

/** Totales del cálculo de M06 tal cual (C7): el carrito no suma ni redondea. */
export function ResumenCarrito({ resumen }: ResumenCarritoProps) {
  return (
    <dl className="space-y-2 text-sm">
      <Fila etiqueta="Subtotal" valor={resumen.subtotalInicial} />
      {resumen.descuentoEventos > 0 && <Fila etiqueta="Ofertas" valor={resumen.descuentoEventos} descuento />}
      {resumen.descuentoEmpresa > 0 && <Fila etiqueta="Descuento empresa" valor={resumen.descuentoEmpresa} descuento />}
      {resumen.descuentoCupon > 0 && <Fila etiqueta="Código de descuento" valor={resumen.descuentoCupon} descuento />}
      <div className="flex justify-between gap-4 border-t border-neutral-light pt-3 text-base font-bold">
        <dt className="text-neutral-black">Total</dt>
        <dd className="text-neutral-black">{formatCOP(resumen.total)}</dd>
      </div>
      <p className="text-xs text-neutral-medium">
        IVA incluido ({resumen.tasaIva} %): {formatCOP(resumen.importeIva)} · Base {formatCOP(resumen.baseSinImpuesto)}.
        El envío se calcula al finalizar la compra.
      </p>
    </dl>
  );
}
