import { formatCOP } from '@/core/utils/moneda';

export interface TotalesOrdenProps {
  subTotal: number;
  descuento: number;
  costoEntrega: number;
  tasaIva: number | null;
  importeIva: number | null;
  total: number;
}

/** Importes congelados de la orden: el IVA conserva el porcentaje de ese día (CA-ORD-02-05). */
export function TotalesOrden({ subTotal, descuento, costoEntrega, tasaIva, importeIva, total }: TotalesOrdenProps) {
  const filas: Array<[string, string]> = [
    ['Subtotal', formatCOP(subTotal)],
    ...(descuento > 0 ? ([['Descuentos', `−${formatCOP(descuento)}`]] as Array<[string, string]>) : []),
    ...(costoEntrega > 0 ? ([['Envío', formatCOP(costoEntrega)]] as Array<[string, string]>) : []),
    ...(importeIva !== null ? ([[`IVA${tasaIva !== null ? ` (${tasaIva} %)` : ''}`, formatCOP(importeIva)]] as Array<[string, string]>) : []),
  ];

  return (
    <dl className="space-y-1 text-sm">
      {filas.map(([etiqueta, valor]) => (
        <div key={etiqueta} className="flex justify-between text-neutral-dark">
          <dt>{etiqueta}</dt>
          <dd>{valor}</dd>
        </div>
      ))}
      <div className="flex justify-between border-t border-neutral-light pt-2 font-title text-base font-bold text-corporate">
        <dt>Total</dt>
        <dd>{formatCOP(total)}</dd>
      </div>
    </dl>
  );
}
