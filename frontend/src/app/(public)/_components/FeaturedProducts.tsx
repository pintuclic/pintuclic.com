import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { ProductCard, ScrollRow } from '@/core/components';
import { featuredLink, featuredProducts } from '../_data/home.content';

/** Sección "Productos destacados" (UI Spec §4.1, punto 5): 5 tarjetas y "Ver todos". */
export function FeaturedProducts() {
  return (
    <section aria-labelledby="titulo-destacados">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 id="titulo-destacados" className="font-title text-xl font-semibold text-neutral-black">
          Productos destacados
        </h2>
        <Link
          href={featuredLink.href}
          className="inline-flex min-h-[44px] items-center gap-1 rounded-btn font-sans text-sm font-medium text-conversion-hover hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50"
        >
          {featuredLink.label}
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <ScrollRow ariaLabel="Productos destacados">
        {featuredProducts.map((producto) => (
          <div key={producto.id} className="w-[228px] shrink-0 snap-start">
            <ProductCard
              id={producto.id}
              name={producto.name}
              description={producto.description}
              price={producto.price}
              originalPrice={producto.originalPrice}
              imageUrl={producto.imageUrl}
              isOffer={Boolean(producto.offerBadge)}
              offerBadgeText={producto.offerBadge}
              href={producto.href}
              className="h-full"
            />
          </div>
        ))}
      </ScrollRow>
    </section>
  );
}
