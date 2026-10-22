import { CategoryCard } from '@/core/components';
import { categoryTiles } from '../_data/home.content';

/** Sección "Explora nuestras categorías" (UI Spec §4.1, punto 6): 5 mosaicos. */
export function CategoryExplorer() {
  return (
    <section aria-labelledby="titulo-categorias">
      <h2 id="titulo-categorias" className="mb-4 font-title text-xl font-semibold text-neutral-black">
        Explora nuestras categorías
      </h2>
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {categoryTiles.map((categoria) => (
          <li key={categoria.href}>
            <CategoryCard title={categoria.title} href={categoria.href} imageSrc={categoria.imageSrc} />
          </li>
        ))}
      </ul>
    </section>
  );
}
