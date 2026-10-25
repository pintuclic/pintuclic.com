'use client';

import { useEffect, useState } from 'react';
import { HelpCircle, Layers } from 'lucide-react';
import { ButtonLink, SearchBar } from '@/core/components';
import { catalogoPublicoApi } from '@/modules/m01-catalogo/services/consulta-publica-api';
import { tools } from '../_data/home.content';

export const EVENTO_FILTRO_LANDING = 'pintuclic:landing-filtro';

export interface DetalleFiltroLanding {
  busqueda: string;
  idCategoria: string;
}

export function emitirFiltroLanding(detalle: DetalleFiltroLanding): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<DetalleFiltroLanding>(EVENTO_FILTRO_LANDING, { detail: detalle }));
}

/**
 * Buscador destacado y accesos directos a herramientas y ayuda (UI Spec §4.1, punto 4).
 * Alimenta el selector de categorías con las categorías reales de `M01`, filtra en vivo
 * la cuadrícula de productos de la portada mientras el usuario escribe o cambia de
 * categoría, y permite también enviar el formulario GET hacia `/productos`.
 */
export function ToolsBar() {
  const [categorias, setCategorias] = useState<ReadonlyArray<{ value: string; label: string }>>(
    tools.search.categories,
  );
  const [busqueda, setBusqueda] = useState('');
  const [idCategoria, setIdCategoria] = useState('');

  useEffect(() => {
    let activo = true;
    catalogoPublicoApi
      .categorias()
      .then((lista) => {
        if (!activo || lista.length === 0) return;
        setCategorias([
          { value: '', label: 'Todas las categorías' },
          ...lista.map((c) => ({ value: String(c.idCategoria), label: c.nombre })),
        ]);
      })
      .catch(() => {
        // Conserva las categorías base si la red no está disponible.
      });

    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    const escucharLimpieza = (e: Event) => {
      const custom = e as CustomEvent<DetalleFiltroLanding>;
      if (custom.detail) {
        setBusqueda(custom.detail.busqueda);
        setIdCategoria(custom.detail.idCategoria);
      }
    };
    window.addEventListener(EVENTO_FILTRO_LANDING, escucharLimpieza);
    return () => window.removeEventListener(EVENTO_FILTRO_LANDING, escucharLimpieza);
  }, []);

  const alCambiarBusqueda = (nuevoTexto: string) => {
    setBusqueda(nuevoTexto);
    emitirFiltroLanding({ busqueda: nuevoTexto, idCategoria });
  };

  const alCambiarCategoria = (nuevaCategoria: string) => {
    setIdCategoria(nuevaCategoria);
    emitirFiltroLanding({ busqueda, idCategoria: nuevaCategoria });
  };

  return (
    <section aria-label="Buscar y herramientas" className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <SearchBar
        action={tools.search.action}
        categories={categorias}
        queryValue={busqueda}
        categoryValue={idCategoria}
        onQueryChange={alCambiarBusqueda}
        onCategoryChange={alCambiarCategoria}
        className="lg:flex-1"
      />
      <ButtonLink
        href={tools.calculator.href}
        variant="primary-conversion"
        rightIcon={<Layers className="h-5 w-5" />}
        className="whitespace-nowrap lg:w-56"
      >
        {tools.calculator.label}
      </ButtonLink>
      <ButtonLink
        href={tools.colorAdvice.href}
        variant="primary-action"
        rightIcon={<HelpCircle className="h-5 w-5" />}
        className="whitespace-nowrap lg:w-60"
      >
        {tools.colorAdvice.label}
      </ButtonLink>
    </section>
  );
}
