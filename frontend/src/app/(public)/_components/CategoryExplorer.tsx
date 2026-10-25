'use client';

import { useEffect, useState } from 'react';
import { CategoryCard } from '@/core/components';
import { catalogoPublicoApi } from '@/modules/m01-catalogo/services/consulta-publica-api';
import { categoryTiles, type CategoryTileContent } from '../_data/home.content';

const IMAGENES_RESPALDO: ReadonlyArray<string> = [
  '/images/landing/categoria-pinturas.png',
  '/images/landing/categoria-construccion.png',
  '/images/landing/categoria-herramientas-manuales.png',
  '/images/landing/categoria-herramientas-electricas.png',
  '/images/landing/categoria-accesorios.png',
];

/**
 * Sección "Explora nuestras categorías" (UI Spec §4.1, punto 6).
 * Sincroniza las categorías activas del catálogo real (`M01`) y filtra
 * `/productos?categoria=<idCategoria>` con el identificador numérico real.
 */
export function CategoryExplorer() {
  const [categorias, setCategorias] = useState<ReadonlyArray<CategoryTileContent>>(categoryTiles);

  useEffect(() => {
    let activo = true;
    catalogoPublicoApi
      .categorias()
      .then((lista) => {
        if (!activo || lista.length === 0) return;
        const mapaBase = new Map(categoryTiles.map((c) => [c.idCategoria, c]));
        const seleccionadas = lista.slice(0, 5).map((cat, idx): CategoryTileContent => {
          const base = mapaBase.get(cat.idCategoria);
          const resumenSubcategorias =
            cat.subcategorias.length > 0
              ? cat.subcategorias
                  .slice(0, 2)
                  .map((s) => s.nombre)
                  .join(' · ')
              : 'Ver línea completa';

          return {
            idCategoria: cat.idCategoria,
            title: cat.nombre,
            subtitle: resumenSubcategorias,
            href: `/productos?categoria=${cat.idCategoria}`,
            imageSrc:
              base?.imageSrc ??
              IMAGENES_RESPALDO[idx % IMAGENES_RESPALDO.length] ??
              '/images/landing/categoria-pinturas.png',
          };
        });
        setCategorias(seleccionadas);
      })
      .catch(() => {
        // Mantiene los mosaicos base en caso de indisponibilidad de red.
      });

    return () => {
      activo = false;
    };
  }, []);

  return (
    <section aria-labelledby="titulo-categorias">
      <div className="mb-4">
        <h2 id="titulo-categorias" className="font-title text-xl font-semibold text-neutral-black">
          Explora nuestras categorías
        </h2>
        <p className="font-sans text-sm text-neutral-medium">
          Filtra directamente por línea de producto para tu obra o remodelación
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {categorias.map((categoria) => (
          <li key={categoria.href}>
            <CategoryCard
              title={categoria.title}
              subtitle={categoria.subtitle}
              href={categoria.href}
              imageSrc={categoria.imageSrc}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
