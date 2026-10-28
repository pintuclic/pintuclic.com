import { formatCOP } from '@/core/utils/moneda';
import type { LineaOrden, LineaOrdenGestion } from '../dtos/m08-ordenes.dto';

/** Líneas con el precio conservado tal como se cobró (RF-ORD-02-01) y su desglose de descuentos. */
export function LineasOrdenLista({ lineas }: { lineas: ReadonlyArray<LineaOrden | LineaOrdenGestion> }) {
  return (
    <ul className="divide-y divide-neutral-light">
      {lineas.map((linea, indice) => (
        <li key={`${linea.skuVendido ?? linea.nombreProducto}-${indice}`} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-title text-sm font-semibold text-neutral-black">{linea.nombreProducto}</p>
              <p className="text-xs text-neutral-medium">
                {linea.varianteCopia}
                {linea.colorSolicitado ? ` · Color: ${linea.colorSolicitado}` : ''}
                {linea.skuVendido ? ` · ${linea.skuVendido}` : ''}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-title text-sm font-bold text-corporate">{formatCOP(linea.precioAplicado * linea.cantidad)}</p>
              <p className="text-xs text-neutral-medium">
                {linea.cantidad} × {formatCOP(linea.precioAplicado)}
              </p>
            </div>
          </div>

          {linea.descuentos.length > 0 && (
            <ul className="text-xs text-neutral-medium">
              {linea.precioInicial !== null && <li>Precio inicial: {formatCOP(linea.precioInicial)}</li>}
              {linea.descuentos.map((d) => (
                <li key={d.ordenAplicacion}>
                  {d.origen}
                  {d.porcentaje !== null ? ` (${d.porcentaje} %)` : ''}: −{formatCOP(d.importe)}
                </li>
              ))}
            </ul>
          )}

          {'baseConsumida' in linea && linea.esEntonado && (
            <p className="text-xs text-neutral-dark">Color entonado a medida · Base: {linea.baseConsumida ?? 'sin dato'}</p>
          )}

          {/* RF-ORD-04-03: sin enlace a la ficha, con la advertencia. */}
          {!linea.productoDisponible && (
            <p className="text-xs font-medium text-danger-hover">Este producto ya no está disponible en el catálogo.</p>
          )}
        </li>
      ))}
    </ul>
  );
}
