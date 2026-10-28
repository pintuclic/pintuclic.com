import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { posicionDeFoco } from '../../utils/foco-imagen';

export interface CategoryCardProps {
  title: string;
  subtitle?: string;
  href: string;
  /** Arte del mosaico, SIN texto incrustado: el título se renderiza como texto real. */
  imageSrc: string;
  /**
   * Punto de enfoque de una imagen subida por el personal (porcentajes 0 a 100): qué parte se ve al recortarla. Con él, la
   * imagen se pinta tal cual (sin pasar por `next/image`) y se recorta alrededor de ese punto; sin él, el arte de siempre.
   */
  imageFocus?: { x: number; y: number };
  ctaLabel?: string;
  /** Tamaños de la imagen para `next/image`. */
  sizes?: string;
  className?: string;
}

/**
 * Mosaico de categoría (UI Spec §4.1, punto 6): imagen, nombre y "Ver productos".
 * Toda la tarjeta es un único enlace. Un degradado corporativo sobre la zona del
 * texto garantiza contraste suficiente sobre cualquier arte (WCAG 1.4.3).
 */
export function CategoryCard({
  title,
  subtitle,
  href,
  imageSrc,
  imageFocus,
  ctaLabel = 'Ver productos',
  sizes = '(min-width: 1024px) 20vw, (min-width: 768px) 33vw, 50vw',
  className = '',
}: CategoryCardProps) {
  return (
    <Link
      href={href}
      className={`group relative block aspect-[234/164] overflow-hidden rounded-card shadow-card transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/70 focus-visible:ring-offset-2 ${className}`}
    >
      {imageFocus !== undefined ? (
        // eslint-disable-next-line @next/next/no-img-element -- imagen subida por el personal, servida por la API
        <img
          src={imageSrc}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full scale-[1.04] object-cover transition-transform duration-300 group-hover:scale-110"
          style={{ objectPosition: posicionDeFoco(imageFocus) }}
        />
      ) : (
        <Image
          src={imageSrc}
          alt=""
          fill
          sizes={sizes}
          className="scale-[1.04] object-cover object-top transition-transform duration-300 group-hover:scale-110"
        />
      )}
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-linear-to-r from-corporate/75 via-corporate/35 to-transparent"
      />
      <span className="absolute inset-0 flex flex-col justify-between p-4">
        <span className="flex flex-col gap-1">
          <span className="max-w-[75%] font-title text-lg font-semibold leading-tight text-neutral-white">
            {title}
          </span>
          {subtitle && (
            <span className="max-w-[80%] font-sans text-xs font-medium text-neutral-white/85">
              {subtitle}
            </span>
          )}
        </span>
        <span className="inline-flex items-center gap-1 font-sans text-sm font-medium text-neutral-white">
          {ctaLabel}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </span>
    </Link>
  );
}
