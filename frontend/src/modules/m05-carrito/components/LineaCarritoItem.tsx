'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Minus, Package, Plus, Trash2 } from 'lucide-react';
import { Button, IconButton, Input } from '@/core/components';
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

  return (
    <li className="flex gap-4 border-b border-neutral-light py-4 last:border-b-0">
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-card bg-neutral-lightest">
        {producto.idImagenPrincipal === null ? (
          <Package aria-hidden className="h-8 w-8 text-neutral-medium" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={carritoApi.urlImagen(producto.idImagenPrincipal)}
            alt=""
            className="h-full w-full object-contain"
            loading="lazy"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {producto.idProducto === null ? (
              <p className="font-semibold text-neutral-black">{nombre}</p>
            ) : (
              <Link href={`/productos/${producto.idProducto}`} className="font-semibold text-neutral-black hover:text-action">
                {nombre}
              </Link>
            )}
            <p className="text-sm text-neutral-medium">
              {[producto.marca, producto.medida].filter((v) => v !== null).join(' · ')}
            </p>
            {producto.color !== null && (
              <p className="mt-1 flex items-center gap-2 text-sm text-neutral-dark">
                <span
                  aria-hidden
                  className="inline-block h-4 w-4 rounded-full border border-neutral-light"
                  style={{ backgroundColor: producto.color.hexadecimal }}
                />
                {producto.color.nombre}
              </p>
            )}
          </div>

          {vendible && precio !== null && (
            <div className="text-left sm:text-right">
              {precio.descuentoTotal !== null && precio.descuentoTotal > 0 && precio.subtotalInicial !== null && (
                <p className="text-sm text-neutral-medium line-through">{formatCOP(precio.subtotalInicial)}</p>
              )}
              <p className="text-lg font-bold text-neutral-black">{formatCOP(precio.subtotal ?? 0)}</p>
            </div>
          )}
        </div>

        {vendible && precio !== null && precio.descuentos.length > 0 && (
          <ul className="mt-2 space-y-0.5 text-sm text-conversion-hover" aria-label={`Descuentos de ${nombre}`}>
            {precio.descuentos.map((d) => (
              <li key={d.ordenAplicacion}>
                {d.origen}
                {d.porcentaje !== null ? ` (−${d.porcentaje} %)` : ''}: −{formatCOP(d.importe)}
              </li>
            ))}
          </ul>
        )}

        {!vendible && (
          <p className="mt-2 rounded-card bg-danger-subtle px-3 py-2 text-sm text-danger-hover" role="status">
            {precio === null ? 'No pudimos calcular el precio de este producto.' : textoNoVendible(precio.motivoNoVendible)}{' '}
            {precio !== null && 'Quítalo para continuar con la compra.'}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-3">
          {vendible && (
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <IconButton
                  aria-label={`Restar una unidad de ${nombre}`}
                  variant="ghost"
                  size="sm"
                  disabled={ocupada || linea.cantidad <= 1}
                  onClick={() => onCambiarCantidad(linea.cantidad - 1)}
                >
                  <Minus aria-hidden className="h-4 w-4" />
                </IconButton>
                <div className="w-20">
                  <Input
                    id={idCantidad}
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
                    className="text-center"
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
          )}
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Trash2 aria-hidden className="h-4 w-4" />}
            disabled={ocupada}
            onClick={onQuitar}
            aria-label={`Quitar ${nombre} del carrito`}
          >
            Quitar
          </Button>
        </div>
      </div>
    </li>
  );
}
