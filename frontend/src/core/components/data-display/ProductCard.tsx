'use client';

import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { Button } from '../buttons/Button';
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
  onViewDetails?: (id: string) => void;
  onAddToCart?: (id: string) => void;
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
  onViewDetails,
  onAddToCart,
  className = '',
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(amount);
  };

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
      <div className="relative w-full h-52 bg-neutral-lightest flex items-center justify-center p-4 overflow-hidden">
        {/* Badges superpuestos en esquina superior izquierda */}
        <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1 items-start">
          {isSponsored && <Badge variant="sponsored">Patrocinado</Badge>}
          {isOffer && <Badge variant="offer">{offerBadgeText}</Badge>}
        </div>

        {imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-contain object-center transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-medium text-xs font-title">
            Sin imagen
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
          onClick={() => onViewDetails?.(id)}
          className="font-title font-semibold text-base text-neutral-black line-clamp-2 leading-snug cursor-pointer hover:text-action transition-colors"
          title={name}
        >
          {name}
        </h3>

        {description && (
          <p className="font-sans text-xs text-neutral-medium line-clamp-2 mt-1 mb-2">
            {description}
          </p>
        )}

        {/* Precios (Destacado Poppins Bold 20px #002855) */}
        <div className="mt-auto pt-2">
          {originalPrice && originalPrice > price && (
            <span className="block font-title text-xs text-neutral-medium line-through">
              {formatCurrency(originalPrice)}
            </span>
          )}
          <span className="block font-title font-bold text-xl text-corporate">
            {formatCurrency(price)}
          </span>
        </div>

        {/* Footer de Acciones (UI Spec sección 4.1.1) */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-neutral-light/50">
          <Button
            type="button"
            variant="outline"
            size="sm"
            fullWidth
            onClick={() => onViewDetails?.(id)}
          >
            Ver producto
          </Button>

          <Button
            type="button"
            variant="primary-conversion"
            size="sm"
            aria-label={`Agregar ${name} al carrito`}
            onClick={() => onAddToCart?.(id)}
            className="px-3 shrink-0"
          >
            <ShoppingCart className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
};

ProductCard.displayName = 'ProductCard';
