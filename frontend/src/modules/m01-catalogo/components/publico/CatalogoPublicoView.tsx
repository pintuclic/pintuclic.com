'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { SlidersHorizontal } from 'lucide-react';
import { Alert, Button, Container, Input, ProductCard, Select, Skeleton } from '@/core/components';
import { useCargar, useRetardo } from '../../hooks/useCargar';
import { catalogoPublicoApi } from '../../services/consulta-publica-api';
import {
  filtrosAConsulta,
  filtrosAUrl,
  filtrosDesdeUrl,
  hayFiltros,
  type FiltrosVitrina,
} from '../../services/filtros-publicos';
import { Paginador } from '../admin/comunes';

const ORDENES: ReadonlyArray<{ value: FiltrosVitrina['ordenar']; label: string }> = [
  { value: 'nombre', label: 'Nombre (A–Z)' },
  { value: 'precio_asc', label: 'Precio: menor a mayor' },
  { value: 'precio_desc', label: 'Precio: mayor a menor' },
];

/** HU-CAT-06: vitrina pública. Los filtros viven en la URL; todo se pide paginado y bajo demanda (U3). */
export const CatalogoPublicoView: React.FC = () => {
  const router = useRouter();
  const ruta = usePathname();
  const parametros = useSearchParams();
  const filtros = useMemo(() => filtrosDesdeUrl(new URLSearchParams(parametros.toString())), [parametros]);
  const [panelAbierto, setPanelAbierto] = useState(false);

  const [busqueda, setBusqueda] = useState(filtros.busqueda);
  const terminoRetardado = useRetardo(busqueda);

  const aplicar = useCallback(
    (cambios: Partial<FiltrosVitrina>) => {
      const siguiente: FiltrosVitrina = { ...filtros, pagina: 1, ...cambios };
      const query = filtrosAUrl(siguiente).toString();
      router.replace(query === '' ? ruta : `${ruta}?${query}`, { scroll: false });
    },
    [filtros, router, ruta],
  );

  // La búsqueda se aplica 300 ms después de la última tecla.
  useEffect(() => {
    if (terminoRetardado.trim() !== filtros.busqueda) aplicar({ busqueda: terminoRetardado.trim() });
    // `aplicar` cambia con los filtros: solo importa reaccionar al término escrito.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terminoRetardado]);

  const categorias = useCargar(catalogoPublicoApi.categorias, 'No se pudieron cargar las categorías.');
  const opciones = useCargar(catalogoPublicoApi.filtros, 'No se pudieron cargar los filtros.');
  const consulta = useMemo(() => filtrosAConsulta(filtros), [filtros]);
  const cargarProductos = useCallback(() => catalogoPublicoApi.productos(consulta), [consulta]);
  const productos = useCargar(cargarProductos, 'No se pudieron cargar los productos.');

  const limpiar = () => {
    setBusqueda('');
    router.replace(ruta, { scroll: false });
  };

  const total = productos.datos?.paginacion.total ?? 0;
  const desde =
    productos.datos === null || total === 0 ? 0 : (filtros.pagina - 1) * productos.datos.paginacion.limite + 1;
  const hasta = productos.datos === null ? 0 : desde + productos.datos.items.length - 1;

  const panel = (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-title text-base font-semibold text-corporate">Filtros</h2>
        {hayFiltros(filtros) && (
          <button
            type="button"
            onClick={limpiar}
            className="min-h-11 rounded-btn px-2 font-title text-sm font-medium text-action hover:text-action-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50"
          >
            Limpiar todo
          </button>
        )}
      </div>

      <Input label="Buscar" type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />

      <nav aria-label="Categorías">
        <h3 className="mb-2 font-title text-sm font-medium text-neutral-dark">Categorías</h3>
        {categorias.datos?.length === 0 && (
          <p className="font-sans text-sm text-neutral-medium">Aún no hay categorías con productos.</p>
        )}
        <ul className="space-y-1">
          {categorias.datos?.map((c) => (
            <li key={c.idCategoria}>
              <button
                type="button"
                aria-pressed={filtros.idCategoria === String(c.idCategoria) && filtros.idSubcategoria === ''}
                onClick={() => aplicar({ idCategoria: String(c.idCategoria), idSubcategoria: '' })}
                className={`min-h-11 w-full rounded-btn px-2 text-left font-title text-sm font-medium hover:bg-neutral-lightest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50 ${
                  filtros.idCategoria === String(c.idCategoria) ? 'text-action' : 'text-neutral-black'
                }`}
              >
                {c.nombre}
              </button>
              {filtros.idCategoria === String(c.idCategoria) && (
                <ul className="ml-3 space-y-1 border-l-2 border-subaction pl-3">
                  {c.subcategorias.map((s) => (
                    <li key={s.idSubcategoria}>
                      <button
                        type="button"
                        aria-pressed={filtros.idSubcategoria === String(s.idSubcategoria)}
                        onClick={() =>
                          aplicar({ idCategoria: String(c.idCategoria), idSubcategoria: String(s.idSubcategoria) })
                        }
                        className={`min-h-11 w-full rounded-btn px-2 text-left font-sans text-sm hover:bg-neutral-lightest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50 ${
                          filtros.idSubcategoria === String(s.idSubcategoria)
                            ? 'font-semibold text-action'
                            : 'text-neutral-dark'
                        }`}
                      >
                        {s.nombre} <span className="text-neutral-medium">({s.totalProductos})</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>

      <Select
        label="Marca"
        value={filtros.idMarca}
        onChange={(e) => aplicar({ idMarca: e.target.value })}
        options={[
          { value: '', label: 'Todas' },
          ...(opciones.datos?.marcas ?? []).map((m) => ({ value: String(m.id), label: m.nombre })),
        ]}
      />
      <Select
        label="Superficie"
        value={filtros.idSuperficie}
        onChange={(e) => aplicar({ idSuperficie: e.target.value })}
        options={[
          { value: '', label: 'Todas' },
          ...(opciones.datos?.superficies ?? []).map((s) => ({ value: String(s.id), label: s.nombre })),
        ]}
      />
      <Select
        label="Ambiente"
        value={filtros.ambiente}
        onChange={(e) => aplicar({ ambiente: e.target.value as FiltrosVitrina['ambiente'] })}
        options={[
          { value: '', label: 'Interior y exterior' },
          ...(opciones.datos?.ambientes ?? []).map((a) => ({
            value: a,
            label: a === 'interior' ? 'Interior' : 'Exterior',
          })),
        ]}
      />
    </div>
  );

  return (
    <Container className="py-8">
      <nav aria-label="Ruta de navegación" className="mb-3 font-sans text-sm text-neutral-medium">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/" className="hover:text-action">
              Inicio
            </Link>
          </li>
          <li aria-hidden="true">›</li>
          <li aria-current="page" className="text-neutral-dark">
            Productos
          </li>
        </ol>
      </nav>
      <h1 className="font-title text-3xl font-bold text-corporate">Catálogo de productos</h1>
      <p className="mt-1 font-sans text-sm text-neutral-medium">
        Encuentre la pintura y los accesorios para su proyecto.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside aria-label="Filtros" className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
          {panel}
        </aside>

        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <p role="status" aria-live="polite" className="font-sans text-sm text-neutral-dark">
              {productos.datos === null
                ? 'Cargando…'
                : total === 0
                  ? 'Sin resultados'
                  : `Mostrando ${desde}-${hasta} de ${total}`}
            </p>
            <div className="flex items-end gap-2">
              <Button
                variant="outline"
                className="lg:hidden"
                leftIcon={<SlidersHorizontal className="h-4 w-4" aria-hidden="true" />}
                onClick={() => setPanelAbierto((v) => !v)}
                aria-expanded={panelAbierto}
              >
                Filtros
              </Button>
              <Select
                label="Ordenar por"
                value={filtros.ordenar}
                onChange={(e) => aplicar({ ordenar: e.target.value as FiltrosVitrina['ordenar'] })}
                options={[...ORDENES]}
              />
            </div>
          </div>

          {panelAbierto && (
            <div className="rounded-card border border-neutral-light bg-neutral-white p-4 lg:hidden">{panel}</div>
          )}

          {productos.error !== null && <Alert variant="error">{productos.error}</Alert>}
          {productos.cargando && productos.datos === null && (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }, (_v, i) => (
                <Skeleton key={i} className="h-80" rounded="card" />
              ))}
            </div>
          )}
          {productos.datos !== null && productos.datos.items.length === 0 && (
            <div className="rounded-card border border-dashed border-neutral-light bg-neutral-lightest px-4 py-12 text-center">
              <p className="font-title text-base font-semibold text-neutral-black">
                No encontramos productos con esos filtros
              </p>
              <p className="mt-1 font-sans text-sm text-neutral-medium">
                Pruebe con otra búsqueda o quite algún filtro.
              </p>
              {hayFiltros(filtros) && (
                <Button className="mt-4" variant="outline" onClick={limpiar}>
                  Limpiar filtros
                </Button>
              )}
            </div>
          )}
          {productos.datos !== null && productos.datos.items.length > 0 && (
            <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {productos.datos.items.map((p) => (
                <li key={p.idProducto} className="flex">
                  <ProductCard
                    id={String(p.idProducto)}
                    name={p.nombre}
                    brand={p.marca}
                    description={`${p.subcategoria}${p.precioDesde === null ? '' : ' · Precio desde'}${p.disponibilidad === 'agotado' ? ' · Agotado por ahora' : ''}`}
                    price={p.precioDesde ?? 0}
                    href={`/productos/${p.idProducto}`}
                    {...(p.idImagenPrincipal === null
                      ? {}
                      : { imageUrl: catalogoPublicoApi.urlImagen(p.idImagenPrincipal) })}
                    className="w-full"
                  />
                </li>
              ))}
            </ul>
          )}
          {productos.datos !== null && (
            <Paginador paginacion={productos.datos.paginacion} onCambiar={(pagina) => aplicar({ pagina })} />
          )}
        </div>
      </div>
    </Container>
  );
};
