'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BrickWall,
  ChevronRight,
  Hammer,
  Home,
  LayoutGrid,
  Package,
  PaintRoller,
  Search,
  Trees,
  X,
} from 'lucide-react';
import { apiClient } from '../../api/apiClient';
import { ButtonLink } from '../buttons/ButtonLink';
import { Modal } from '../overlays/Modal';

export interface MegaMenuItem {
  label: string;
  href: string;
}

export interface MegaMenuSubGroup {
  title: string;
  items: ReadonlyArray<MegaMenuItem>;
  verMasHref?: string;
}

export type MegaMenuTabIcon = 'paredes' | 'madera' | 'metal' | 'superficies' | 'herramientas';

export interface MegaMenuTab {
  id: string;
  title: string;
  icon: MegaMenuTabIcon;
  columns: ReadonlyArray<MegaMenuSubGroup>;
}

export interface MegaMenuGroup {
  title: string;
  items: ReadonlyArray<MegaMenuItem>;
}

export interface MegaMenuAssistant {
  text: string;
  ctaLabel: string;
  href: string;
}

export interface CategoriesMegaMenuProps {
  isOpen: boolean;
  onClose: () => void;
  groups?: ReadonlyArray<MegaMenuGroup>;
  tabs?: ReadonlyArray<MegaMenuTab>;
  assistant: MegaMenuAssistant;
  title?: string;
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

interface MapeoDestino {
  tabId: string;
  colTitle: string;
  verMasHref?: string;
}

const MAPEO_SUBCATEGORIAS: Readonly<Record<number, ReadonlyArray<MapeoDestino>>> = {
  // Paredes y techos
  1: [{ tabId: 'paredes-techos', colTitle: 'Pinturas', verMasHref: '/productos?superficie=1' }],
  2: [{ tabId: 'paredes-techos', colTitle: 'Pinturas', verMasHref: '/productos?superficie=1' }],
  5: [{ tabId: 'paredes-techos', colTitle: 'Pinturas', verMasHref: '/productos?superficie=1' }],
  6: [{ tabId: 'paredes-techos', colTitle: 'Pinturas', verMasHref: '/productos?superficie=1' }],
  7: [{ tabId: 'paredes-techos', colTitle: 'Preparación de superficies', verMasHref: '/productos?categoria=2' }],
  8: [{ tabId: 'paredes-techos', colTitle: 'Preparación de superficies', verMasHref: '/productos?categoria=2' }],
  9: [{ tabId: 'paredes-techos', colTitle: 'Preparación de superficies', verMasHref: '/productos?categoria=2' }],
  13: [{ tabId: 'paredes-techos', colTitle: 'Impermeabilizantes', verMasHref: '/productos?categoria=4' }],
  // Madera
  10: [{ tabId: 'madera', colTitle: 'Pinturas y Barnices', verMasHref: '/productos?superficie=2' }],
  11: [{ tabId: 'madera', colTitle: 'Pinturas y Barnices', verMasHref: '/productos?superficie=2' }],
  12: [{ tabId: 'madera', colTitle: 'Pinturas y Barnices', verMasHref: '/productos?superficie=2' }],
  3: [
    { tabId: 'madera', colTitle: 'Pinturas y Barnices', verMasHref: '/productos?superficie=2' },
    { tabId: 'metal', colTitle: 'Pinturas para Metal', verMasHref: '/productos?superficie=3' },
  ],
  // Metal
  4: [{ tabId: 'metal', colTitle: 'Pinturas para Metal', verMasHref: '/productos?superficie=3' }],
  16: [{ tabId: 'metal', colTitle: 'Aerosoles', verMasHref: '/productos?categoria=5' }],
  17: [{ tabId: 'metal', colTitle: 'Aerosoles', verMasHref: '/productos?categoria=5' }],
  // Otras Superficies
  14: [{ tabId: 'otras-superficies', colTitle: 'Impermeabilización', verMasHref: '/productos?superficie=5' }],
  15: [{ tabId: 'otras-superficies', colTitle: 'Impermeabilización', verMasHref: '/productos?superficie=5' }],
  // Herramientas
  18: [{ tabId: 'herramientas', colTitle: 'Aplicación', verMasHref: '/productos?categoria=6' }],
  19: [{ tabId: 'herramientas', colTitle: 'Aplicación', verMasHref: '/productos?categoria=6' }],
  20: [{ tabId: 'herramientas', colTitle: 'Aplicación', verMasHref: '/productos?categoria=6' }],
  21: [{ tabId: 'herramientas', colTitle: 'Protección y Acabado', verMasHref: '/productos?categoria=6' }],
  22: [{ tabId: 'herramientas', colTitle: 'Protección y Acabado', verMasHref: '/productos?categoria=6' }],
};

function renderTabIcon(icon: MegaMenuTabIcon, className: string) {
  switch (icon) {
    case 'paredes':
      return <Home className={className} aria-hidden="true" />;
    case 'madera':
      return <Trees className={className} aria-hidden="true" />;
    case 'metal':
      return <Hammer className={className} aria-hidden="true" />;
    case 'superficies':
      return <BrickWall className={className} aria-hidden="true" />;
    case 'herramientas':
      return <PaintRoller className={className} aria-hidden="true" />;
    default:
      return <LayoutGrid className={className} aria-hidden="true" />;
  }
}

/**
 * Mega-menú de categorías y superficies (UI Spec §3.2): panel MODAL con barra de
 * búsqueda en vivo, pestañas horizontales por superficie/categoría (Top 5 destacados),
 * columnas filtrables interactivamente y banda inferior del asistente.
 */
export function CategoriesMegaMenu({
  isOpen,
  onClose,
  groups,
  tabs,
  assistant,
  title = '¿Qué buscas?',
}: CategoriesMegaMenuProps) {
  const [tabActivaId, setTabActivaId] = useState<string>(() => tabs?.[0]?.id ?? '');
  const [busqueda, setBusqueda] = useState<string>('');
  const [tabsDinamicos, setTabsDinamicos] = useState<ReadonlyArray<MegaMenuTab> | null>(null);

  // Sincronización dinámica: consulta las subcategorías reales y solo muestra las que tienen productos (>0)
  useEffect(() => {
    if (!isOpen || !tabs) return;
    let activo = true;

    apiClient
      .get<{
        success: boolean;
        data: Array<{
          subcategorias: Array<{ idSubcategoria: number; nombre: string; totalProductos: number }>;
        }>;
      }>('/catalogo/categorias')
      .then((res) => {
        if (!activo || !res.data?.data) return;
        const agrupado = new Map<string, Map<string, { items: MegaMenuItem[]; verMasHref?: string }>>();

        for (const cat of res.data.data) {
          for (const sub of cat.subcategorias) {
            if (sub.totalProductos <= 0) continue; // Omite las que no tienen productos
            const destinos = MAPEO_SUBCATEGORIAS[sub.idSubcategoria] ?? [];
            for (const dest of destinos) {
              if (!agrupado.has(dest.tabId)) agrupado.set(dest.tabId, new Map());
              const colsTab = agrupado.get(dest.tabId)!;
              if (!colsTab.has(dest.colTitle)) {
                colsTab.set(dest.colTitle, { items: [], verMasHref: dest.verMasHref });
              }
              colsTab.get(dest.colTitle)!.items.push({
                label: sub.nombre,
                href: `/productos?subcategoria=${sub.idSubcategoria}`,
              });
            }
          }
        }

        const actualizados: MegaMenuTab[] = tabs.map((base) => {
          const colsTab = agrupado.get(base.id);
          if (!colsTab) return { ...base, columns: [] };
          const columns: MegaMenuSubGroup[] = [];
          for (const [colTitle, data] of colsTab.entries()) {
            columns.push({
              title: colTitle,
              items: data.items,
              verMasHref: data.verMasHref,
            });
          }
          return { ...base, columns };
        });

        setTabsDinamicos(actualizados);
      })
      .catch(() => {
        // En caso de que el backend no responda, mantiene tabs base sin error
      });

    return () => {
      activo = false;
    };
  }, [isOpen, tabs]);

  const tabsEfectivos = tabsDinamicos ?? tabs;
  const termino = useMemo(() => normalizar(busqueda), [busqueda]);

  const idActual = tabActivaId || tabsEfectivos?.[0]?.id || '';
  const tabSeleccionada = tabsEfectivos?.find((t) => t.id === idActual) ?? tabsEfectivos?.[0];

  // Conteo de coincidencias por pestaña cuando hay búsqueda activa
  const conteoPorTab = useMemo(() => {
    if (!termino || !tabsEfectivos) return new Map<string, number>();
    const mapa = new Map<string, number>();
    for (const tab of tabsEfectivos) {
      let count = 0;
      for (const col of tab.columns) {
        for (const item of col.items) {
          if (normalizar(item.label).includes(termino) || normalizar(col.title).includes(termino)) {
            count++;
          }
        }
      }
      mapa.set(tab.id, count);
    }
    return mapa;
  }, [tabsEfectivos, termino]);

  // Columnas filtradas para la pestaña seleccionada (Top 5 por grupo)
  const columnasFiltradas = useMemo(() => {
    if (!tabSeleccionada) return [];
    return tabSeleccionada.columns
      .map((col) => {
        const coincideColTitulo = termino && normalizar(col.title).includes(termino);
        const items = col.items
          .filter((item) => !termino || coincideColTitulo || normalizar(item.label).includes(termino))
          .slice(0, 5); // Estrictamente Top 5
        return {
          ...col,
          items,
        };
      })
      .filter((col) => !termino || col.items.length > 0);
  }, [tabSeleccionada, termino]);

  const handleCerrar = () => {
    setBusqueda('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCerrar}
      size="xl"
      title={
        <span className="inline-flex items-center gap-2 font-title text-base sm:text-lg font-bold text-corporate">
          <LayoutGrid className="h-5 w-5 text-action" aria-hidden="true" />
          {title}
        </span>
      }
    >
      {/* Barra de búsqueda interactiva superior dentro del modal */}
      <div className="mb-4">
        <form
          action="/productos"
          method="GET"
          onSubmit={(e) => {
            if (!busqueda.trim()) {
              e.preventDefault();
              return;
            }
            handleCerrar();
          }}
          className="relative"
        >
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-medium"
            aria-hidden="true"
          />
          <input
            type="text"
            name="q"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Busca lo que necesitas..."
            className="w-full rounded-btn border border-neutral-light bg-neutral-light/20 py-2.5 pl-10 pr-10 font-sans text-sm text-neutral-dark placeholder:text-neutral-medium transition-colors hover:border-action/40 focus:border-action focus:bg-neutral-white focus:outline-none focus:ring-2 focus:ring-action/20"
          />
          {busqueda ? (
            <button
              type="button"
              onClick={() => setBusqueda('')}
              aria-label="Limpiar filtro"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-neutral-medium hover:bg-neutral-light hover:text-neutral-dark"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : null}
        </form>
      </div>

      {tabsEfectivos && tabsEfectivos.length > 0 ? (
        <div>
          {/* Barra de pestañas horizontales con iconos */}
          <div
            role="tablist"
            aria-label="Superficies y categorías"
            className="flex flex-wrap gap-2 border-b border-neutral-light pb-2"
          >
            {tabsEfectivos.map((tab) => {
              const esActiva = tab.id === tabSeleccionada?.id;
              const matchesEnTab = conteoPorTab.get(tab.id) ?? 0;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  type="button"
                  aria-selected={esActiva}
                  onClick={() => setTabActivaId(tab.id)}
                  className={`group flex items-center gap-2 rounded-btn px-3.5 py-2.5 font-title text-xs sm:text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50 ${
                    esActiva
                      ? 'bg-subaction text-action shadow-sm ring-1 ring-action/20'
                      : 'text-neutral-dark hover:bg-neutral-light/60 hover:text-action'
                  }`}
                >
                  {renderTabIcon(
                    tab.icon,
                    `h-4 w-4 shrink-0 transition-colors ${
                      esActiva ? 'text-action' : 'text-neutral-medium group-hover:text-action'
                    }`
                  )}
                  <span>{tab.title}</span>
                  {termino && matchesEnTab > 0 ? (
                    <span
                      className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                        esActiva ? 'bg-action text-neutral-white' : 'bg-neutral-light text-neutral-dark'
                      }`}
                    >
                      {matchesEnTab}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Contenido de la pestaña activa */}
          {tabSeleccionada && (
            <div role="tabpanel" key={tabSeleccionada.id} className="mt-5 min-h-[180px]">
              {tabSeleccionada.columns.length === 0 ? (
                /* Estado cuando la superficie/categoría aún no tiene productos registrados en la BD */
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="mb-3 rounded-full bg-subaction p-3 text-action">
                    <Package className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <h4 className="font-title text-sm font-bold text-corporate">
                    No hay productos disponibles en {tabSeleccionada.title} por el momento
                  </h4>
                  <p className="mt-1 max-w-sm font-sans text-xs text-neutral-dark">
                    Actualmente no hay productos registrados en esta sección. Tan pronto el administrador cargue productos en el catálogo, se mostrarán aquí automáticamente.
                  </p>
                  <Link
                    href="/productos"
                    onClick={handleCerrar}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-btn bg-action px-4 py-2 font-title text-xs font-bold text-neutral-white transition-colors hover:bg-action-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50"
                  >
                    Ver catálogo completo
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ) : columnasFiltradas.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {columnasFiltradas.map((col) => (
                    <section key={col.title} aria-label={col.title}>
                      <h4 className="mb-2.5 font-title text-sm font-bold uppercase tracking-wider text-corporate">
                        {col.title}
                      </h4>
                      <ul className="space-y-1">
                        {col.items.map((item) => (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              onClick={handleCerrar}
                              className="flex min-h-[36px] items-center justify-between rounded-btn px-2.5 py-1.5 font-sans text-sm text-neutral-dark transition-colors hover:bg-subaction/50 hover:text-action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50"
                            >
                              <span>{item.label}</span>
                              <ChevronRight className="h-3.5 w-3.5 text-neutral-medium" aria-hidden="true" />
                            </Link>
                          </li>
                        ))}
                      </ul>
                      {col.verMasHref && (
                        <div className="mt-2.5 pl-2.5">
                          <Link
                            href={col.verMasHref}
                            onClick={handleCerrar}
                            className="inline-flex items-center gap-1 font-title text-xs font-bold uppercase tracking-wider text-action transition-colors hover:underline"
                          >
                            Ver más
                            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                          </Link>
                        </div>
                      )}
                    </section>
                  ))}
                </div>
              ) : (
                /* Estado cuando el filtro no coincide con nada en esta pestaña */
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="font-sans text-sm text-neutral-dark">
                    No encontramos opciones destacadas para{' '}
                    <strong>&ldquo;{busqueda}&rdquo;</strong> en {tabSeleccionada.title}.
                  </p>
                  <Link
                    href={`/productos?q=${encodeURIComponent(busqueda.trim())}`}
                    onClick={handleCerrar}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-btn bg-action px-4 py-2 font-title text-xs font-bold text-neutral-white transition-colors hover:bg-action-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50"
                  >
                    <Search className="h-3.5 w-3.5" />
                    Buscar &ldquo;{busqueda.trim()}&rdquo; en todo el catálogo
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      ) : groups && groups.length > 0 ? (
        /* Fallback si solo se proporcionan grupos simples */
        <div className="grid gap-6 md:grid-cols-3">
          {groups.map((grupo) => (
            <section key={grupo.title} aria-label={grupo.title}>
              <h4 className="mb-2 font-title text-base font-semibold text-corporate">{grupo.title}</h4>
              <ul>
                {grupo.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={handleCerrar}
                      className="flex min-h-[44px] items-center justify-between rounded-btn px-3 py-2 font-sans text-sm text-neutral-dark transition-colors hover:bg-subaction/50 hover:text-action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50"
                    >
                      {item.label}
                      <ChevronRight className="h-4 w-4 text-neutral-medium" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : null}

      <div className="mt-6 flex flex-col items-start justify-between gap-4 rounded-card bg-subaction p-4 sm:flex-row sm:items-center">
        <p className="font-sans text-sm text-corporate">{assistant.text}</p>
        <ButtonLink href={assistant.href} variant="primary-action" onClick={handleCerrar} className="shrink-0">
          {assistant.ctaLabel}
        </ButtonLink>
      </div>
    </Modal>
  );
}
