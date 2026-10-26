'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Minus, Package, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, IconButton, Input } from '@/core/components';
import { formatCOP } from '@/core/utils/moneda';
import { CANTIDAD_MAXIMA_POR_LINEA, type LineaCarrito } from '../dtos/m05-carrito.dto';
import { cantidadFormSchema } from '../dtos/formularios.dto';
import { carritoApi } from '../services/carrito-api';
import { textoNoVendible } from '../services/textos-carrito';

export interface LineaCarritoItemProps {
  linea: LineaCarrito;
  ocupada: boolean;
  onCambiarCantidad: (cantidad: number) => void;
  onQuitar: () => void;
}

/** Una línea del carrito: producto, cantidad, desglose de descuentos y subtotal (C6, C7). */
export function LineaCarritoItem({ linea, ocupada, onCambiarCantidad, onQuitar }: LineaCarritoItemProps) {
  const { producto, precio } = linea;
  const vendible = precio?.vendible === true;
  const nombre = producto.nombre ?? 'Producto';
  const tope = producto.esCombo && producto.topeUnidades !== null ? producto.topeUnidades : CANTIDAD_MAXIMA_POR_LINEA;
  const conDescuento = vendible && precio !== null && (precio.descuentoTotal ?? 0) > 0;
  const [texto, setTexto] = useState(String(linea.cantidad));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTexto(String(linea.cantidad));
    setError(null);
  }, [linea.cantidad]);

  const confirmarTexto = (): void => {
    const r = cantidadFormSchema.safeParse(texto);
    if (!r.success) {
      setError(r.error.issues[0]?.message ?? 'Cantidad no válida.');
      return;
    }
    if (r.data > tope) {
      setError(`Solo hay ${tope} unidades disponibles.`);
      return;
    }
    setError(null);
    if (r.data !== linea.cantidad) onCambiarCantidad(r.data);
  };

  const idCantidad = `cantidad-${linea.idLinea}`;
  const idError = `${idCantidad}-error`;
  const enlace = producto.idProducto === null ? null : `/productos/${producto.idProducto}`;

  const imagen = (
    <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-card border border-neutral-light bg-neutral-lightest sm:h-28 sm:w-28">
      {producto.idImagenPrincipal === null ? (
        <Package aria-hidden className="h-10 w-10 text-neutral-medium" />
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
  );

  return (
    <li className={`flex gap-4 p-4 sm:gap-5 sm:p-5 ${vendible ? '' : 'bg-neutral-lightest'}`}>
      {enlace === null ? imagen : <Link href={enlace} tabIndex={-1} aria-hidden>{imagen}</Link>}

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0 space-y-1">
            {producto.marca !== null && (
              <p className="font-title text-xs font-medium uppercase tracking-wider text-neutral-medium">{producto.marca}</p>
            )}
            {enlace === null ? (
              <p className="font-title text-base font-semibold text-neutral-black">{nombre}</p>
            ) : (
              <Link href={enlace} className="font-title text-base font-semibold text-neutral-black hover:text-action">
                {nombre}
              </Link>
            )}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-dark">
              {producto.medida !== null && <span>{producto.medida}</span>}
              {producto.color !== null && (
                <span className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="inline-block h-4 w-4 rounded-full border border-neutral-medium/40"
                    style={{ backgroundColor: producto.color.hexadecimal }}
                  />
                  {producto.color.nombre}
                </span>
              )}
            </div>
            {vendible && precio?.precioUnitarioFinal !== null && precio?.precioUnitarioFinal !== undefined && (
              <p className="text-sm text-neutral-medium">{formatCOP(precio.precioUnitarioFinal)} c/u</p>
            )}
          </div>

          {vendible && precio !== null && (
            <div className="shrink-0 sm:text-right">
              {conDescuento && precio.subtotalInicial !== null && (
                <p className="text-sm text-neutral-medium">
                  <span className="sr-only">Antes </span>
                  <s>{formatCOP(precio.subtotalInicial)}</s>
                </p>
              )}
              <p className="font-title text-lg font-bold text-neutral-black">{formatCOP(precio.subtotal ?? 0)}</p>
            </div>
          )}
        </div>

        {conDescuento && precio !== null && (
          <ul className="flex flex-wrap gap-2" aria-label={`Descuentos de ${nombre}`}>
            {precio.descuentos.map((d) => (
              <li key={d.ordenAplicacion}>
                <Badge variant="offer">
                  {d.origen}
                  {d.porcentaje !== null ? ` −${d.porcentaje} %` : ''} · −{formatCOP(d.importe)}
                </Badge>
              </li>
            ))}
          </ul>
        )}

        {!vendible && (
          <p className="rounded-card bg-danger-subtle px-3 py-2 text-sm text-danger-hover" role="status">
            {precio === null ? 'No pudimos calcular el precio de este producto.' : textoNoVendible(precio.motivoNoVendible)}{' '}
            {precio !== null && 'Quítalo para continuar con la compra.'}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          {vendible ? (
            <div>
              <div className="inline-flex items-center rounded-btn border border-neutral-light bg-neutral-white">
                <IconButton
                  aria-label={`Restar una unidad de ${nombre}`}
                  variant="ghost"
                  size="sm"
                  disabled={ocupada || linea.cantidad <= 1}
                  onClick={() => onCambiarCantidad(linea.cantidad - 1)}
                >
                  <Minus aria-hidden className="h-4 w-4" />
                </IconButton>
                <div className="w-14">
                  <Input
                    id={idCantidad}
                    appearance="bare"
                    aria-label={`Cantidad de ${nombre}`}
                    inputMode="numeric"
                    value={texto}
                    disabled={ocupada}
                    aria-invalid={error !== null}
                    aria-describedby={error !== null ? idError : undefined}
                    onChange={(e) => setTexto(e.target.value)}
                    onBlur={confirmarTexto}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') confirmarTexto();
                    }}
                    className="px-1 text-center font-semibold text-neutral-black"
                  />
                </div>
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
              {error !== null && (
                <p id={idError} className="mt-1 text-sm text-danger-hover">
                  {error}
                </p>
              )}
            </div>
          ) : (
            <span />
          )}
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Trash2 aria-hidden className="h-4 w-4" />}
            disabled={ocupada}
            onClick={onQuitar}
            aria-label={`Quitar ${nombre} del carrito`}
            className="text-neutral-medium hover:text-danger"
          >
            Quitar
          </Button>
        </div>
      </div>
    </li>
  );
}
