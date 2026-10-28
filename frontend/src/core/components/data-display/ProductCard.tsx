'use client';

import React from 'react';
import Link from 'next/link';
import { Ban, ShoppingCart } from 'lucide-react';
import { Button } from '../buttons/Button';
import { ButtonLink } from '../buttons/ButtonLink';
import { esColorMuyClaro, esHexadecimal } from '../../utils/color-muestra';
import { formatCOP } from '../../utils/moneda';
import { Badge } from './Badge';

export interface ProductCardProps {
  id: string;
  name: string;
  brand?: string;
  description?: string;
  price: number;
  originalPrice?: number;
  imageUrl?: string;
  isSponsored?: boolean;
  isOffer?: boolean;
  offerBadgeText?: string;
  /** Si existe, el nombre y "Ver producto" son enlaces de navegación a esta ruta. */
  href?: string;
  onViewDetails?: (id: string) => void;
  onAddToCart?: (id: string) => void;
  /**
   * Color `#RRGGBB` del producto: la imagen va sobre una muestra de ese color que ocupa la mayor parte de la tarjeta,
   * con el borde de arriba en una ola suave. Sin él (o si no es válido) se ve el fondo neutro de siempre.
   */
  swatchColor?: string;
  /** Texto del color bajo el nombre (por ejemplo "Azul Cielo · y 45 colores más"), con un punto de ese color. */
  swatchLabel?: string;
  /**
   * Con `false` no se pinta "Ver producto": el carrito queda junto al precio y la imagen y el nombre llevan a la
   * ficha. Por defecto se muestra, como en el resto de pantallas.
   */
  showViewDetails?: boolean;
  className?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  id,
  name,
  brand,
  description,
  price,
  originalPrice,
  imageUrl,
  isSponsored = false,
  isOffer = false,
  offerBadgeText = 'Oferta',
  href,
  onViewDetails,
  onAddToCart,
  swatchColor,
  swatchLabel,
  showViewDetails = true,
  className = '',
}) => {
  // UI Spec §4.1.1: "$ 98.900 COP".
  const formatCurrency = (amount: number) => `${formatCOP(amount)} COP`;
  const muestra = swatchColor !== undefined && esHexadecimal(swatchColor) ? swatchColor : null;

  // Precios (Destacado Poppins Bold 20px #002855)
  const precios = (
    <>
      {originalPrice && originalPrice > price && (
        <span className="block font-title text-xs text-neutral-medium line-through">
          {formatCurrency(originalPrice)}
        </span>
      )}
      <span className="block font-title font-bold text-xl text-corporate">{formatCurrency(price)}</span>
    </>
  );

  const botonCarrito =
    href && !onAddToCart ? (
      <ButtonLink
        href={href}
        variant="primary-conversion"
        size="sm"
        aria-label={`Agregar ${name} al carrito`}
        className="px-3 shrink-0 max-sm:min-h-11 max-sm:min-w-11"
      >
        <ShoppingCart className="w-4 h-4" aria-hidden="true" />
      </ButtonLink>
    ) : (
      <Button
        type="button"
        variant="primary-conversion"
        size="sm"
        aria-label={`Agregar ${name} al carrito`}
        onClick={() => onAddToCart?.(id)}
        className="px-3 shrink-0 max-sm:min-h-11 max-sm:min-w-11"
      >
        <ShoppingCart className="w-4 h-4" aria-hidden="true" />
      </Button>
    );

  return (
    <div
      className={`
        group relative flex flex-col bg-neutral-white rounded-card shadow-card
        border border-neutral-light/60 overflow-hidden
        transition-all duration-300 ease-in-out
        hover:shadow-card-hover hover:-translate-y-1
        ${className}
      `}
    >
      {/* Contenedor de Imagen de Producto (UI Spec sección 4.1.1) */}
      <div
        className={`relative w-full h-56 flex items-center justify-center p-4 overflow-hidden ${
          muestra === null ? 'bg-neutral-lightest' : 'bg-neutral-white'
        }`}
      >
        {/* Sin "Ver producto", toda la imagen lleva a la ficha. Es un atajo para el ratón y el toque: el teclado y el
            lector de pantalla usan el enlace del nombre, por eso este no recibe foco ni se anuncia. */}
        {href && !showViewDetails && (
          <Link href={href} tabIndex={-1} aria-hidden="true" className="absolute inset-0 z-[15]" />
        )}

        {/* Badges superpuestos en esquina superior izquierda */}
        <div className="absolute top-2.5 left-2.5 z-20 flex flex-col gap-1 items-start">
          {isSponsored && <Badge variant="sponsored">Patrocinado</Badge>}
          {isOffer && <Badge variant="offer">{offerBadgeText}</Badge>}
        </div>

        {/* Muestra de pintura: el color llena la parte baja de la tarjeta de lado a lado, con una ola suave arriba. El color
            es un dato del catálogo, no del tema: por eso va en `fill`. Es decorativa: no se lee en voz alta. */}
        {muestra !== null && (
          <div
            aria-hidden="true"
            data-muestra-color={muestra}
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[76%] transition-transform duration-300 group-hover:scale-y-[1.03] origin-bottom"
          >
            <svg viewBox="0 0 400 170" preserveAspectRatio="none" className="h-full w-full" focusable="false">
              <path
                d="M0 20 C 55 6, 120 34, 200 20 S 335 4, 400 18 L400 170 L0 170 Z"
                fill={muestra}
                className={esColorMuyClaro(muestra) ? 'stroke-neutral-light' : 'stroke-transparent'}
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>
        )}

        {imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={imageUrl}
            alt={name}
            width={400}
            height={300}
            /* Sin muestra, mix-blend-multiply funde el fondo blanco de las fotos con el gris. Con muestra no: la mezcla
               teñiría el envase con el color (un negro lo borraría); las fotos del catálogo tienen fondo transparente. */
            className={`relative z-10 w-full h-full object-contain object-center transition-transform duration-300 group-hover:scale-105 ${
              muestra === null ? 'mix-blend-multiply' : 'drop-shadow-md'
            }`}
            loading="lazy"
          />
        ) : (
          /* Sin imagen todavía: un círculo tachado, para que se note que falta y no se confunda con otro producto. */
          <div
            role="img"
            aria-label="Sin imagen disponible"
            className="relative z-10 flex h-24 w-24 items-center justify-center rounded-full border-2 border-neutral-medium/40 bg-neutral-white/90 text-neutral-medium shadow-xs"
          >
            <Ban className="h-10 w-10" strokeWidth={1.5} aria-hidden="true" />
          </div>
        )}
      </div>

      {/* Contenido / Información del Producto */}
      <div className="flex flex-col flex-1 p-4">
        {brand && (
          <span className="font-title text-xs text-neutral-medium uppercase tracking-wider mb-1">
            {brand}
          </span>
        )}

        <h3
          className="font-title font-semibold text-base text-neutral-black leading-snug"
          title={name}
        >
          {href ? (
            <Link
              href={href}
              className="line-clamp-2 cursor-pointer rounded-btn transition-colors hover:text-action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50"
            >
              {name}
            </Link>
          ) : onViewDetails ? (
            <button
              type="button"
              onClick={() => onViewDetails(id)}
              className="text-left line-clamp-2 cursor-pointer hover:text-action transition-colors rounded-btn focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50"
            >
              {name}
            </button>
          ) : (
            <span className="line-clamp-2">{name}</span>
          )}
        </h3>

        {muestra !== null && swatchLabel !== undefined && swatchLabel !== '' && (
          <p className="mt-1 flex items-center gap-1.5 font-sans text-xs font-medium text-neutral-dark">
            <span
              aria-hidden="true"
              className="h-3 w-3 shrink-0 rounded-full ring-1 ring-inset ring-neutral-black/10"
              style={{ backgroundColor: muestra }}
            />
            <span className="truncate">{swatchLabel}</span>
          </p>
        )}

        {description && (
          <p className="font-sans text-xs text-neutral-medium line-clamp-2 mt-1 mb-2">
            {description}
          </p>
        )}

        {showViewDetails ? (
          <>
            <div className="mt-auto pt-2">{precios}</div>

            {/* Footer de Acciones (UI Spec sección 4.1.1) */}
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-neutral-light/50">
              {href ? (
                <ButtonLink
                  href={href}
                  variant="outline"
                  size="sm"
                  fullWidth
                  aria-label={`Ver producto: ${name}`}
                  className="max-sm:min-h-11"
                >
                  Ver producto
                </ButtonLink>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  fullWidth
                  onClick={() => onViewDetails?.(id)}
                >
                  Ver producto
                </Button>
              )}
              {botonCarrito}
            </div>
          </>
        ) : (
          /* Sin "Ver producto": el carrito va junto al precio. */
          <div className="mt-auto flex items-end justify-between gap-3 pt-3">
            <div className="min-w-0">{precios}</div>
            {botonCarrito}
          </div>
        )}
      </div>
    </div>
  );
};

ProductCard.displayName = 'ProductCard';
