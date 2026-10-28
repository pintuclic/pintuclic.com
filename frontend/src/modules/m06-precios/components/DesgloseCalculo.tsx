'use client';

import React from 'react';
import { Alert, Badge } from '@/core/components';
import type { Calculo, DescuentoAplicado } from '../dtos/m06-precios.dto';
import { ETIQUETAS_MOTIVO_CUPON, formatearPesos, formatearPorcentaje } from '../services/etiquetas';

const ETIQUETA_ORIGEN: Record<DescuentoAplicado['tipoOrigen'], string> = {
  evento: 'Evento',
  empresa: 'Empresa',
  cupon: 'Cupón',
};

const MOTIVOS_NO_VENDIBLE: Record<string, string> = {
  variante_no_existe: 'La variante no existe.',
  variante_inactiva: 'La variante está inactiva.',
  producto_no_disponible: 'El producto no está disponible.',
  color_no_ofrecido: 'El producto no ofrece ese color.',
  combo_agotado: 'El combo está agotado.',
};

/** El resultado de un cálculo de precios, paso a paso, tal como lo congelaría una orden. */
export const DesgloseCalculo: React.FC<{ calculo: Calculo; nombres: ReadonlyMap<number, string> }> = ({
  calculo,
  nombres,
}) => {
  const r = calculo.resumen;
  return (
    <div className="space-y-4" aria-live="polite">
      {calculo.avisos.map((a) =>
        a.tipo === 'empresa_falta_monto' ? (
          <Alert key={a.tipo} variant="warning">
            Al cliente se le avisaría: «Te faltan {formatearPesos(a.faltante)} para recibir tu{' '}
            {formatearPorcentaje(a.porcentaje)} de descuento {a.tipoCliente}».
          </Alert>
        ) : (
          <Alert key={a.tipo} variant="info">
            Al cliente se le invitaría a pedir la cuenta empresa (su compra pasa de {formatearPesos(a.umbral)}).
          </Alert>
        ),
      )}
      {calculo.cupon !== null && (
        <Alert variant={calculo.cupon.aplicado ? 'success' : 'warning'}>
          Cupón {calculo.cupon.codigo}:{' '}
          {calculo.cupon.aplicado
            ? `aplicado, descuenta ${formatearPesos(calculo.cupon.descuento)}.`
            : `${calculo.cupon.motivoRechazo === null ? '' : ETIQUETAS_MOTIVO_CUPON[calculo.cupon.motivoRechazo]}${
                calculo.cupon.montoMinimo === null ? '' : ` Mínimo: ${formatearPesos(calculo.cupon.montoMinimo)}.`
              }`}
        </Alert>
      )}
      {calculo.empresa !== null && (
        <p className="font-sans text-sm text-neutral-dark">
          Descuento de empresa ({calculo.empresa.tipo}, {formatearPorcentaje(calculo.empresa.porcentaje)}):{' '}
          <strong className="text-neutral-black">
            {calculo.empresa.aplicado ? `aplicado, ${formatearPesos(calculo.empresa.descuento)}` : 'no se aplica'}
          </strong>
          . Total del carrito después de eventos: {formatearPesos(calculo.empresa.totalCarrito)}; compra mínima:{' '}
          {calculo.empresa.montoMinimoCompra === 0 ? 'ninguna' : formatearPesos(calculo.empresa.montoMinimoCompra)}.
        </p>
      )}

      <div className="overflow-x-auto rounded-card border border-neutral-light bg-neutral-white">
        <table className="w-full min-w-[720px] text-left font-sans text-sm">
          <caption className="sr-only">Precio de cada línea, paso a paso</caption>
          <thead className="bg-neutral-lightest text-xs uppercase tracking-wide text-neutral-medium">
            <tr>
              <th scope="col" className="px-4 py-3">
                Producto
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Cant.
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Precio base
              </th>
              <th scope="col" className="px-4 py-3">
                Descuentos, en orden
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Subtotal
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-light">
            {calculo.lineas.map((l) => (
              <tr key={l.indice}>
                <td className="px-4 py-3 text-neutral-black">
                  {nombres.get(l.idVariante) ?? `Variante ${l.idVariante}`}
                  {l.excluidoDeDescuentos && (
                    <Badge variant="neutral" className="ml-2">
                      Sin descuentos
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-neutral-dark">{l.cantidad}</td>
                {l.vendible && l.precioInicial !== null && l.subtotal !== null ? (
                  <>
                    <td className="px-4 py-3 text-right text-neutral-dark">{formatearPesos(l.precioInicial)}</td>
                    <td className="px-4 py-3 text-neutral-dark">
                      {l.descuentos.length === 0 ? (
                        <span className="text-neutral-medium">—</span>
                      ) : (
                        <ol className="space-y-0.5">
                          {l.descuentos.map((d) => (
                            <li key={d.ordenAplicacion}>
                              {d.ordenAplicacion}.{' '}
                              <span className="text-neutral-medium">{ETIQUETA_ORIGEN[d.tipoOrigen]}:</span> {d.origen}
                              {d.porcentaje !== null && ` (${formatearPorcentaje(d.porcentaje)})`} → −
                              {formatearPesos(d.importe)}
                            </li>
                          ))}
                        </ol>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-title font-semibold text-neutral-black">
                      {formatearPesos(l.subtotal)}
                    </td>
                  </>
                ) : (
                  <td colSpan={3} className="px-4 py-3 text-neutral-medium">
                    No se puede vender:{' '}
                    {l.motivoNoVendible === null
                      ? 'sin detalle'
                      : (MOTIVOS_NO_VENDIBLE[l.motivoNoVendible] ?? l.motivoNoVendible)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="ml-auto grid max-w-sm grid-cols-[1fr_auto] gap-x-6 gap-y-1 font-sans text-sm">
        <dt className="text-neutral-dark">Subtotal</dt>
        <dd className="text-right text-neutral-black">{formatearPesos(r.subtotalInicial)}</dd>
        <dt className="text-neutral-dark">Eventos</dt>
        <dd className="text-right text-neutral-black">−{formatearPesos(r.descuentoEventos)}</dd>
        <dt className="text-neutral-dark">Empresa</dt>
        <dd className="text-right text-neutral-black">−{formatearPesos(r.descuentoEmpresa)}</dd>
        <dt className="text-neutral-dark">Cupón</dt>
        <dd className="text-right text-neutral-black">−{formatearPesos(r.descuentoCupon)}</dd>
        <dt className="border-t border-neutral-light pt-1 font-title font-semibold text-neutral-black">
          Total (IVA incluido)
        </dt>
        <dd className="border-t border-neutral-light pt-1 text-right font-title font-semibold text-neutral-black">
          {formatearPesos(r.total)}
        </dd>
        <dt className="text-xs text-neutral-medium">Base sin IVA ({formatearPorcentaje(r.tasaIva)})</dt>
        <dd className="text-right text-xs text-neutral-medium">{formatearPesos(r.baseSinImpuesto)}</dd>
        <dt className="text-xs text-neutral-medium">IVA</dt>
        <dd className="text-right text-xs text-neutral-medium">{formatearPesos(r.importeIva)}</dd>
      </dl>
    </div>
  );
};
