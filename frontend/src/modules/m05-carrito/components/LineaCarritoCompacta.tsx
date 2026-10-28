'use client';

import Link from 'next/link';
import { Minus, Package, Plus, Trash2 } from 'lucide-react';
import { Badge, IconButton } from '@/core/components';
import { formatCOP } from '@/core/utils/moneda';
import { CANTIDAD_MAXIMA_POR_LINEA, type LineaCarrito } from '../dtos/m05-carrito.dto';
import { carritoApi } from '../services/carrito-api';
import { textoNoVendible } from '../services/textos-carrito';

export interface LineaCarritoCompactaProps {
  linea: LineaCarrito;
  ocupada: boolean;
  onCambiarCantidad: (cantidad: number) => void;
  onQuitar: () => void;
}

/**
 * Una línea en el panel lateral (L3): lo mismo que en /carrito pero compacto, sin el desglose de descuentos ni el
 * campo para escribir la cantidad. Las reglas son las mismas: tope de combo, línea de cotización con cantidad fija
 * (C15) y línea no vendible con su motivo.
 */
export function LineaCarritoCompacta({ linea, ocupada, onCambiarCantidad, onQuitar }: LineaCarritoCompactaProps) {
  const { producto, precio } = linea;
  const vendible = precio?.vendible === true;
  const nombre = producto.nombre ?? 'Producto';
  const tope = producto.esCombo && producto.topeUnidades !== null ? producto.topeUnidades : CANTIDAD_MAXIMA_POR_LINEA;
  const cotizada = linea.idCotizacion !== null;
  const enlace = producto.idProducto === null ? null : `/productos/${producto.idProducto}`;

  return (
    <li className={`flex gap-3 py-4 ${vendible ? '' : 'rounded-card bg-neutral-lightest px-2'}`}>
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-input border border-neutral-light bg-neutral-lightest">
        {producto.idImagenPrincipal === null ? (
          <Package aria-hidden className="h-7 w-7 text-neutral-medium" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={carritoApi.urlImagen(producto.idImagenPrincipal)}
            alt=""
            className="h-full w-full object-contain p-1"
            loading="lazy"
          />
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          {enlace === null ? (
            <p className="font-title text-sm font-semibold text-neutral-black">{nombre}</p>
          ) : (
            <Link href={enlace} className="font-title text-sm font-semibold text-neutral-black hover:text-action">
              {nombre}
            </Link>
          )}
          {vendible && precio !== null && (
            <p className="shrink-0 font-title text-sm font-bold text-neutral-black">{formatCOP(precio.subtotal ?? 0)}</p>
          )}
        </div>

        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-neutral-dark">
          {producto.color !== null && (
            <span className="flex items-center gap-1">
              <span
                aria-hidden
                className="inline-block h-3 w-3 rounded-full border border-neutral-medium/40"
                style={{ backgroundColor: producto.color.hexadecimal }}
              />
              {producto.color.nombre}
            </span>
          )}
          {producto.medida !== null && <span>{producto.medida}</span>}
        </p>

        {cotizada && <Badge variant="success">Precio de tu cotización</Badge>}

        {!vendible && (
          <p className="text-xs text-danger-hover" role="status">
            {precio === null ? 'No pudimos calcular el precio de este producto.' : textoNoVendible(precio.motivoNoVendible)}
          </p>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          {cotizada ? (
            <p className="text-xs text-neutral-dark">
              Cantidad: <span className="font-semibold text-neutral-black">{linea.cantidad}</span>
            </p>
          ) : vendible ? (
            <div className="inline-flex items-center rounded-btn border border-neutral-light">
              <IconButton
                aria-label={`Restar una unidad de ${nombre}`}
                variant="ghost"
                size="sm"
                disabled={ocupada || linea.cantidad <= 1}
                onClick={() => onCambiarCantidad(linea.cantidad - 1)}
              >
                <Minus aria-hidden className="h-4 w-4" />
              </IconButton>
              <span className="min-w-8 text-center text-sm font-semibold text-neutral-black">
                <span className="sr-only">Cantidad: </span>
                {linea.cantidad}
              </span>
              <IconButton
                aria-label={`Sumar una unidad de ${nombre}`}
                variant="ghost"
                size="sm"
                disabled={ocupada || linea.cantidad >= tope}
                onClick={() => onCambiarCantidad(linea.cantidad + 1)}
              >
                <Plus aria-hidden className="h-4 w-4" />
              </IconButton>
            </div>
          ) : (
            <span />
          )}
          <IconButton
            aria-label={`Quitar ${nombre} del carrito`}
            variant="ghost"
            size="sm"
            disabled={ocupada}
            onClick={onQuitar}
            className="text-neutral-medium hover:text-danger"
          >
            <Trash2 aria-hidden className="h-4 w-4" />
          </IconButton>
        </div>
      </div>
    </li>
  );
}
