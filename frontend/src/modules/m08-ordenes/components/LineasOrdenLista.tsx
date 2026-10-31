import type { ReactNode } from 'react';
import { Badge } from '@/core/components';
import { formatCOP } from '@/core/utils/moneda';
import type { LineaOrden, LineaOrdenGestion } from '../dtos/m08-ordenes.dto';
import {
  ETIQUETA_DISPONIBILIDAD,
  ETIQUETA_ESTADO_LINEA,
  varianteDisponibilidad,
  varianteEstadoLinea,
} from '../services/presentacion';

/** Lo que cada rol ve del estado de un producto: el personal el estado propio; el cliente, su resumen (R16). */
function EstadoDeLinea({ linea }: { linea: LineaOrden | LineaOrdenGestion }) {
  if ('estadoLinea' in linea) {
    return (
      <Badge variant={varianteEstadoLinea(linea.estadoLinea)} pill>
        {ETIQUETA_ESTADO_LINEA[linea.estadoLinea]}
      </Badge>
    );
  }
  if (linea.disponibilidad === null) return null;
  return (
    <Badge variant={varianteDisponibilidad(linea.disponibilidad)} pill>
      {ETIQUETA_DISPONIBILIDAD[linea.disponibilidad]}
    </Badge>
  );
}

export interface LineasOrdenListaProps {
  lineas: ReadonlyArray<LineaOrden | LineaOrdenGestion>;
  /**
   * Lo que se añade bajo cada producto (por ejemplo, los controles de la revisión de M09). Recibe la posición de la línea
   * empezando en 1, que es su `numeroLinea` en M09 (las líneas de una orden no cambian ni se reordenan).
   */
  controles?: ((numeroLinea: number) => ReactNode) | undefined;
}

/** Líneas con el precio conservado tal como se cobró (RF-ORD-02-01), su desglose de descuentos y el estado de cada una. */
export function LineasOrdenLista({ lineas, controles }: LineasOrdenListaProps) {
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
              <div className="mt-1.5">
                <EstadoDeLinea linea={linea} />
              </div>
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

          {/* El personal ve qué le están diciendo al cliente mientras el producto no está (M08 R16, D14 de M09). */}
          {'estadoLinea' in linea && linea.disponibilidad === 'rechazado' && (
            <p className="text-xs text-neutral-medium">El cliente ve este producto como «Rechazado».</p>
          )}

          {/* RF-ORD-04-03: sin enlace a la ficha, con la advertencia. */}
          {!linea.productoDisponible && (
            <p className="text-xs font-medium text-danger-hover">Este producto ya no está disponible en el catálogo.</p>
          )}

          {controles?.(indice + 1)}
        </li>
      ))}
    </ul>
  );
}
