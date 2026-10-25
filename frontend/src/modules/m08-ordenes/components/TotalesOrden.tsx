import { desgloseTotales, type ImportesOrden } from '../services/presentacion';

/**
 * Importes congelados de la orden (RF-ORD-02-02). Los precios incluyen IVA: el total es subtotal −
 * descuentos + envío, y el IVA se muestra como nota de lo que el total ya contiene, no como un sumando.
 */
export function TotalesOrden(importes: ImportesOrden) {
  const { filas, total, ivaIncluido } = desgloseTotales(importes);

  return (
    <div>
      <dl className="space-y-1 text-sm">
        {filas.map((fila) => (
          <div key={fila.etiqueta} className="flex justify-between text-neutral-dark">
            <dt>{fila.etiqueta}</dt>
            <dd>{fila.valor}</dd>
          </div>
        ))}
        <div className="flex justify-between border-t border-neutral-light pt-2 font-title text-base font-bold text-corporate">
          <dt>Total</dt>
          <dd>{total}</dd>
        </div>
      </dl>
      {ivaIncluido && <p className="pt-1 text-xs text-neutral-medium">{ivaIncluido}</p>}
    </div>
  );
}
