'use client';

import React from 'react';
import Link from 'next/link';
import { PaintBucket, ShoppingCart } from 'lucide-react';
import { Button } from '../buttons/Button';
import { ButtonLink } from '../buttons/ButtonLink';
import { esColorMuyClaro, esHexadecimal, luminancia } from '../../utils/color-muestra';

/** Por debajo de esta luminancia el color es casi negro (negros, grafitos, azules muy profundos). */
const LUMINANCIA_OSCURA = 0.04;
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
   * Color `#RRGGBB` del producto: la imagen va sobre un panel de ese color, como una muestra de pintura.
   * Sin él (o si no es válido) se ve el fondo neutro de siempre.
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

function resolverImagenPorDefecto(name: string, imageUrl?: string): string | undefined {
  if (imageUrl) return imageUrl;
  const n = name.toLowerCase();
  if (n.includes('viniltex')) return '/images/landing/catalogo-viniltex.png';
  if (n.includes('koraza')) return '/images/landing/catalogo-koraza.png';
  if (n.includes('pintulux')) return '/images/landing/catalogo-pintulux.png';
  if (n.includes('ico') || n.includes('esmalte')) return '/images/landing/catalogo-esmalte-ico.png';
  if (n.includes('barniz') || n.includes('madera')) return '/images/landing/catalogo-barniz.png';
  if (n.includes('brocha')) return '/images/landing/producto-brocha.png';
  if (n.includes('rodillo')) return '/images/landing/producto-rodillo.png';
  if (n.includes('cinta')) return '/images/landing/producto-cinta.png';
  return undefined;
}

/**
 * Fondo de la muestra: un halo del color bajo el envase que se funde con el blanco. Un color casi blanco no se vería,
 * así que debajo lleva una sombra gris muy tenue para que el halo se note.
 */
function resplandor(hexadecimal: string): string {
  // Un color muy oscuro con toda su fuerza parece una sombra: se baja su intensidad.
  const [centro, medio] = luminancia(hexadecimal) < LUMINANCIA_OSCURA ? ['73', '26'] : ['d9', '66'];
  const halo = `radial-gradient(ellipse 75% 65% at 50% 78%, ${hexadecimal}${centro} 0%, ${hexadecimal}${medio} 40%, ${hexadecimal}00 72%)`;
  return esColorMuyClaro(hexadecimal)
    ? `${halo}, radial-gradient(ellipse 70% 55% at 50% 80%, rgb(17 24 39 / 0.08) 0%, rgb(17 24 39 / 0) 70%)`
    : halo;
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
  const imagenEfectiva = resolverImagenPorDefecto(name, imageUrl);
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
        className={`relative w-full h-52 flex items-center justify-center p-4 overflow-hidden ${
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

        {/* Resplandor suave del color detrás del envase, que se desvanece hacia el blanco: insinúa el tono sin
            tapar el producto (el color exacto va en el punto junto a su nombre). Es un dato del catálogo, no del
            tema: por eso va en `style`. Es decorativo: no se lee en voz alta. */}
        {muestra !== null && (
          <div
            aria-hidden="true"
            data-muestra-color={muestra}
            className="absolute inset-0 transition-opacity duration-300 group-hover:opacity-90"
            style={{ background: resplandor(muestra) }}
          />
        )}

        {imagenEfectiva ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={imagenEfectiva}
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
          <div className="relative z-10 flex h-full w-full flex-col items-center justify-center gap-2 rounded-card bg-linear-to-br from-subaction/60 via-neutral-lightest to-subaction/30 p-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-white shadow-sm transition-transform duration-300 group-hover:scale-105">
              <PaintBucket className="h-8 w-8 text-action" strokeWidth={1.75} aria-hidden="true" />
            </div>
            <span className="font-title text-xs font-medium text-corporate/80">
              {brand || 'Pintu Clic'}
            </span>
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
