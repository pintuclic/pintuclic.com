import React from 'react';
import { formatCOP } from '@/core/utils/moneda';
import type { Comprobante } from '../dtos/m12-facturacion.dto';
import { fechaDelComprobante } from '../services/formato-comprobante';

/** Lo que va siempre al pie: el comprobante no es una factura electrónica. */
export const AVISO_NO_FACTURA = 'Comprobante de venta. No es factura electrónica ni tiene validez fiscal ante la DIAN.';

/**
 * El documento tal como se imprime: papel carta/A4, blanco y negro, sin botones ni menús. Solo presenta lo que trae el
 * comprobante (copia congelada); no calcula nada.
 */
export const ComprobanteDocumento: React.FC<{ comprobante: Comprobante }> = ({ comprobante: c }) => (
  <article
    data-testid="comprobante-documento"
    aria-label={`Comprobante de venta ${c.numero}`}
    className="comprobante-imprimible mx-auto w-full max-w-[210mm] bg-neutral-white p-6 font-sans text-sm text-neutral-black shadow-card print:max-w-none print:p-0 print:shadow-none sm:p-10"
  >
    <header className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-neutral-black pb-4">
      <div>
        <h1 className="font-title text-xl font-bold">{c.vendedor.razonSocial}</h1>
        <p>NIT {c.vendedor.nit}</p>
        {c.vendedor.regimen !== null && <p>{c.vendedor.regimen}</p>}
        <p>
          {c.vendedor.direccion}
          {c.vendedor.ciudad !== null && `, ${c.vendedor.ciudad}`}
        </p>
        {(c.vendedor.telefono !== null || c.vendedor.correo !== null) && (
          <p>{[c.vendedor.telefono, c.vendedor.correo].filter((x): x is string => x !== null).join(' · ')}</p>
        )}
      </div>
      <div className="text-right">
        <p className="font-title text-xs font-semibold uppercase tracking-wider text-neutral-medium">Comprobante de venta</p>
        <p className="font-title text-2xl font-bold">{c.numero}</p>
        <p className="mt-1">Pedido {c.codigoOrden}</p>
        <p>{fechaDelComprobante(c.fechaEmision)}</p>
      </div>
    </header>

    <section aria-labelledby="comprobante-comprador" className="grid gap-1 border-b border-neutral-light py-4">
      <h2 id="comprobante-comprador" className="font-title text-xs font-semibold uppercase tracking-wider text-neutral-medium">
        Cliente
      </h2>
      <p className="font-semibold">{c.comprador.nombre}</p>
      {c.comprador.documento !== null && <p>NIT {c.comprador.documento}</p>}
      <p>{c.comprador.correo}</p>
      {c.comprador.telefono !== null && <p>{c.comprador.telefono}</p>}
      <p>Entrega: {c.comprador.direccion}</p>
    </section>

    <table className="my-4 w-full border-collapse text-left">
      <caption className="sr-only">Productos del comprobante {c.numero}</caption>
      <thead>
        <tr className="border-b border-neutral-black text-xs uppercase tracking-wide">
          <th scope="col" className="py-2 pr-2">Producto</th>
          <th scope="col" className="px-2 py-2 text-right">Cant.</th>
          <th scope="col" className="px-2 py-2 text-right">Precio</th>
          <th scope="col" className="px-2 py-2 text-right">Dcto. unit.</th>
          <th scope="col" className="py-2 pl-2 text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        {c.lineas.map((l, i) => (
          <tr key={`${l.descripcion}-${String(i)}`} className="border-b border-neutral-light align-top">
            <td className="py-2 pr-2">
              <span className="block font-semibold">{l.descripcion}</span>
              <span className="block text-xs text-neutral-dark">
                {l.presentacion}
                {l.color !== null && ` · ${l.color}`}
              </span>
            </td>
            <td className="px-2 py-2 text-right">{l.cantidad}</td>
            <td className="px-2 py-2 text-right">{formatCOP(l.precioUnitario)}</td>
            <td className="px-2 py-2 text-right">{l.descuentoUnitario > 0 ? `−${formatCOP(l.descuentoUnitario)}` : '—'}</td>
            <td className="py-2 pl-2 text-right font-semibold">{formatCOP(l.totalLinea)}</td>
          </tr>
        ))}
      </tbody>
    </table>

    <dl className="ml-auto grid max-w-xs grid-cols-[1fr_auto] gap-x-6 gap-y-1">
      <dt>Subtotal</dt>
      <dd className="text-right">{formatCOP(c.subtotal)}</dd>
      {c.descuento > 0 && (
        <>
          <dt>Descuentos</dt>
          <dd className="text-right">−{formatCOP(c.descuento)}</dd>
        </>
      )}
      {c.envio > 0 && (
        <>
          <dt>Envío</dt>
          <dd className="text-right">{formatCOP(c.envio)}</dd>
        </>
      )}
      <dt>Base sin IVA</dt>
      <dd className="text-right">{formatCOP(c.baseSinIva)}</dd>
      <dt>IVA ({String(c.tasaIva).replace('.', ',')} %)</dt>
      <dd className="text-right">{formatCOP(c.iva)}</dd>
      <dt className="border-t-2 border-neutral-black pt-1 font-title text-base font-bold">Total</dt>
      <dd className="border-t-2 border-neutral-black pt-1 text-right font-title text-base font-bold">{formatCOP(c.total)}</dd>
    </dl>

    <div className="mt-8 border-t border-neutral-light pt-3 text-xs text-neutral-dark">
      {c.pieLegal !== null && <p>{c.pieLegal}</p>}
      <p>{AVISO_NO_FACTURA}</p>
    </div>
  </article>
);
