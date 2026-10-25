'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { Alert, Button, Container, ProductCard, Select, Skeleton } from '@/core/components';
import { BotonContactoDirecto } from '@/modules/m15-atencion/components/publico/BotonContactoDirecto';
import { Paginador } from '@/modules/m01-catalogo/components/admin/comunes';
import type { OpcionesFiltro, PaginaBusqueda, ResultadoBusqueda } from '../dtos/busqueda.dto';
import { busquedaApi } from '../services/busqueda-api';
import type { FiltrosBusqueda } from '../services/filtros-busqueda';
import {
  filtrosAUrl,
  filtrosDesdeUrl,
  hayFiltrosActivos,
} from '../services/filtros-busqueda';
import { BusquedaFiltrosSidebar } from './BusquedaFiltrosSidebar';

const ORDENES: ReadonlyArray<{ value: FiltrosBusqueda['ordenar']; label: string }> = [
  { value: 'relevancia', label: 'Relevancia' },
  { value: 'precio_asc', label: 'Precio: menor a mayor' },
  { value: 'precio_desc', label: 'Precio: mayor a menor' },
  { value: 'novedad', label: 'Novedades' },
];

export const BusquedaCatalogoView: React.FC = () => {
  const router = useRouter();
  const ruta = usePathname();
  const parametros = useSearchParams();

  const filtros = useMemo(
    () => filtrosDesdeUrl(new URLSearchParams(parametros.toString())),
    [parametros],
  );

  const [panelMovilAbierto, setPanelMovilAbierto] = useState(false);
  const [textoBusqueda, setTextoBusqueda] = useState(filtros.q);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<PaginaBusqueda<ResultadoBusqueda> | null>(null);
  const [opcionesFiltro, setOpcionesFiltro] = useState<OpcionesFiltro | null>(null);

  const aplicar = useCallback(
    (cambios: Partial<FiltrosBusqueda>) => {
      const siguiente: FiltrosBusqueda = { ...filtros, ...cambios };
      const query = filtrosAUrl(siguiente).toString();
      router.replace(query === '' ? ruta : `${ruta}?${query}`, { scroll: false });
    },
    [filtros, router, ruta],
  );

  // Debounce para el input de texto (300 ms)
  useEffect(() => {
    setTextoBusqueda(filtros.q);
  }, [filtros.q]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (textoBusqueda.trim() !== filtros.q) {
        aplicar({ q: textoBusqueda.trim(), pagina: 1 });
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [textoBusqueda, filtros.q, aplicar]);

  // Cargar productos y opciones de filtro cuando cambian los filtros en la URL
  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    setError(null);

    Promise.all([busquedaApi.productos(filtros), busquedaApi.filtros(filtros)])
      .then(([respProductos, respFiltros]) => {
        if (!cancelado) {
          setResultado(respProductos);
          setOpcionesFiltro(respFiltros);
          setCargando(false);
        }
      })
      .catch(() => {
        if (!cancelado) {
          setError('No fue posible cargar el catálogo. Por favor intente nuevamente.');
          setCargando(false);
        }
      });

    return () => {
      cancelado = true;
    };
  }, [filtros]);

  const limpiarTodo = () => {
    setTextoBusqueda('');
    router.replace(ruta, { scroll: false });
  };

  const total = resultado?.paginacion.total ?? 0;
  const desde =
    resultado === null || total === 0 ? 0 : (filtros.pagina - 1) * resultado.paginacion.limite + 1;
  const hasta = resultado === null ? 0 : desde + resultado.items.length - 1;

  // Generar chips para filtros activos
  const chipsActivos = useMemo(() => {
    const chips: Array<{ id: string; label: string; onQuitar: () => void }> = [];

    if (filtros.q) {
      chips.push({
        id: 'q',
        label: `"${filtros.q}"`,
        onQuitar: () => {
          setTextoBusqueda('');
          aplicar({ q: '', pagina: 1 });
        },
      });
    }

    if (opcionesFiltro) {
      for (const idCat of filtros.idCategoria) {
        const cat = opcionesFiltro.categorias.find((c) => c.id === idCat);
        if (cat) {
          chips.push({
            id: `cat-${idCat}`,
            label: cat.nombre,
            onQuitar: () =>
              aplicar({
                idCategoria: filtros.idCategoria.filter((id) => id !== idCat),
                pagina: 1,
              }),
          });
        }
      }

      for (const idSub of filtros.idSubcategoria) {
        const sub = opcionesFiltro.subcategorias.find((s) => s.id === idSub);
        if (sub) {
          chips.push({
            id: `sub-${idSub}`,
            label: sub.nombre,
            onQuitar: () =>
              aplicar({
                idSubcategoria: filtros.idSubcategoria.filter((id) => id !== idSub),
                pagina: 1,
              }),
          });
        }
      }

      for (const idM of filtros.idMarca) {
        const m = opcionesFiltro.marcas.find((marca) => marca.id === idM);
        if (m) {
          chips.push({
            id: `marca-${idM}`,
            label: m.nombre,
            onQuitar: () =>
              aplicar({
                idMarca: filtros.idMarca.filter((id) => id !== idM),
                pagina: 1,
              }),
          });
        }
      }

      for (const idL of filtros.idLinea) {
        const l = opcionesFiltro.lineas.find((linea) => linea.id === idL);
        if (l) {
          chips.push({
            id: `linea-${idL}`,
            label: l.nombre,
            onQuitar: () =>
              aplicar({
                idLinea: filtros.idLinea.filter((id) => id !== idL),
                pagina: 1,
              }),
          });
        }
      }

      for (const idFam of filtros.idFamiliaColor) {
        const fam = opcionesFiltro.familiasColor.find((f) => f.id === idFam);
        if (fam) {
          chips.push({
            id: `fam-${idFam}`,
            label: `Color: ${fam.nombre}`,
            onQuitar: () =>
              aplicar({
                idFamiliaColor: filtros.idFamiliaColor.filter((id) => id !== idFam),
                pagina: 1,
              }),
          });
        }
      }

      for (const idMed of filtros.idMedida) {
        const med = opcionesFiltro.presentaciones.find((p) => p.id === idMed);
        if (med) {
          chips.push({
            id: `med-${idMed}`,
            label: med.nombre,
            onQuitar: () =>
              aplicar({
                idMedida: filtros.idMedida.filter((id) => id !== idMed),
                pagina: 1,
              }),
          });
        }
      }

      for (const idSup of filtros.idSuperficie) {
        const sup = opcionesFiltro.superficies.find((s) => s.id === idSup);
        if (sup) {
          chips.push({
            id: `sup-${idSup}`,
            label: sup.nombre,
            onQuitar: () =>
              aplicar({
                idSuperficie: filtros.idSuperficie.filter((id) => id !== idSup),
                pagina: 1,
              }),
          });
        }
      }
    }

    if (filtros.ambiente) {
      chips.push({
        id: 'ambiente',
        label: filtros.ambiente === 'interior' ? 'Ambiente: Interior' : 'Ambiente: Exterior',
        onQuitar: () => aplicar({ ambiente: undefined, pagina: 1 }),
      });
    }

    if (filtros.precioMin !== undefined || filtros.precioMax !== undefined) {
      let labelPrecio = 'Precio: ';
      if (filtros.precioMin !== undefined && filtros.precioMax !== undefined) {
        labelPrecio += `$${filtros.precioMin.toLocaleString()} - $${filtros.precioMax.toLocaleString()}`;
      } else if (filtros.precioMin !== undefined) {
        labelPrecio += `Desde $${filtros.precioMin.toLocaleString()}`;
      } else if (filtros.precioMax !== undefined) {
        labelPrecio += `Hasta $${filtros.precioMax.toLocaleString()}`;
      }
      chips.push({
        id: 'precio',
        label: labelPrecio,
        onQuitar: () => aplicar({ precioMin: undefined, precioMax: undefined, pagina: 1 }),
      });
    }

    return chips;
  }, [filtros, opcionesFiltro, aplicar]);

  return (
    <Container className="py-8">
      {/* Miga de pan */}
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

      {/* Título principal y buscador */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-title text-3xl font-bold text-corporate">Catálogo de productos</h1>
          <p className="mt-1 font-sans text-sm text-neutral-medium">
            Encuentre pinturas, recubrimientos y accesorios con búsqueda inteligente y filtros.
          </p>
        </div>

        {/* Buscador en cabecera */}
        <div className="relative w-full md:w-80">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-medium" />
          <input
            type="text"
            placeholder="Buscar por nombre, marca, color…"
            value={textoBusqueda}
            onChange={(e) => setTextoBusqueda(e.target.value)}
            className="w-full rounded-btn border border-neutral-light bg-neutral-white py-2 pr-9 pl-9 text-sm text-neutral-black placeholder-neutral-medium focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
          />
          {textoBusqueda && (
            <button
              type="button"
              onClick={() => {
                setTextoBusqueda('');
                aplicar({ q: '', pagina: 1 });
              }}
              className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-full p-0.5 text-neutral-medium hover:text-neutral-black focus-visible:outline-none"
              aria-label="Borrar búsqueda"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Chips de filtros activos */}
      {chipsActivos.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-b border-neutral-light pb-4">
          <span className="text-xs font-semibold text-neutral-medium">Filtros aplicados:</span>
          {chipsActivos.map((chip) => (
            <span
              key={chip.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-neutral-lightest px-3 py-1 text-xs font-medium text-neutral-dark border border-neutral-light"
            >
              <span>{chip.label}</span>
              <button
                type="button"
                onClick={chip.onQuitar}
                className="rounded-full p-0.5 hover:bg-neutral-light hover:text-neutral-black focus-visible:outline-none"
                aria-label={`Quitar filtro ${chip.label}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={limpiarTodo}
            className="ml-1 text-xs font-semibold text-action transition-colors hover:text-action-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50 rounded-xs"
          >
            Limpiar todos
          </button>
        </div>
      )}

      {/* Layout de 2 columnas: Sidebar + Grid */}
      <div className="mt-6 grid gap-8 lg:grid-cols-[260px_1fr]">
        {/* Sidebar desktop */}
        <aside aria-label="Filtros" className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
          <BusquedaFiltrosSidebar
            filtros={filtros}
            opciones={opcionesFiltro}
            onCambiar={aplicar}
          />
        </aside>

        {/* Contenido principal */}
        <div className="min-w-0 space-y-4">
          {/* Barra superior de conteo y ordenamiento */}
          <div className="flex flex-wrap items-end justify-between gap-3">
            <p role="status" aria-live="polite" className="font-sans text-sm text-neutral-dark">
              {cargando && resultado === null
                ? 'Buscando productos…'
                : total === 0
                  ? 'Sin resultados'
                  : `Mostrando ${desde}-${hasta} de ${total} productos`}
            </p>

            <div className="flex items-end gap-2">
              <Button
                variant="outline"
                className="lg:hidden"
                leftIcon={<SlidersHorizontal className="h-4 w-4" aria-hidden="true" />}
                onClick={() => setPanelMovilAbierto((v) => !v)}
                aria-expanded={panelMovilAbierto}
              >
                Filtros {hayFiltrosActivos(filtros) && '•'}
              </Button>

              <Select
                label="Ordenar por"
                value={filtros.ordenar}
                onChange={(e) =>
                  aplicar({ ordenar: e.target.value as FiltrosBusqueda['ordenar'], pagina: 1 })
                }
                options={[...ORDENES]}
              />
            </div>
          </div>

          {/* Panel móvil colapsable */}
          {panelMovilAbierto && (
            <div className="rounded-card border border-neutral-light bg-neutral-white p-5 shadow-sm lg:hidden">
              <BusquedaFiltrosSidebar
                filtros={filtros}
                opciones={opcionesFiltro}
                onCambiar={aplicar}
              />
            </div>
          )}

          {/* Errores */}
          {error !== null && <Alert variant="error">{error}</Alert>}

          {/* Estado de carga */}
          {cargando && resultado === null && (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }, (_v, i) => (
                <Skeleton key={i} className="h-80" rounded="card" />
              ))}
            </div>
          )}

          {/* Sin resultados */}
          {!cargando && resultado !== null && resultado.items.length === 0 && (
            <div className="rounded-card border border-dashed border-neutral-light bg-neutral-lightest px-4 py-16 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-white shadow-xs">
                <Search className="h-6 w-6 text-neutral-medium" />
              </div>
              <p className="mt-3 font-title text-lg font-semibold text-neutral-black">
                No encontramos productos que coincidan con tu búsqueda
              </p>
              <p className="mx-auto mt-1 max-w-md font-sans text-sm text-neutral-medium">
                {filtros.q
                  ? `No hubo resultados para "${filtros.q}". Revisa la ortografía o prueba con palabras más generales.`
                  : 'Prueba quitando algunos de los filtros seleccionados para ampliar la búsqueda.'}
              </p>
              {hayFiltrosActivos(filtros) && (
                <Button className="mt-5" variant="outline" onClick={limpiarTodo}>
                  Limpiar todos los filtros
                </Button>
              )}
            </div>
          )}

          {/* Grid de productos */}
          {resultado !== null && resultado.items.length > 0 && (
            <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {resultado.items.map((p) => (
                <li key={p.idProducto} className="flex flex-col">
                  <div className="relative flex-1">
                    <ProductCard
                      id={String(p.idProducto)}
                      name={p.nombre}
                      brand={p.marca}
                      description={`${p.esCombo ? 'Combo · ' : ''}${p.subcategoria}${
                        p.precioDesde === null ? '' : ' · Precio desde'
                      }${p.disponibilidad === 'agotado' ? ' · Agotado por ahora' : ''}`}
                      price={p.precioDesde ?? 0}
                      href={`/productos/${p.idProducto}`}
                      {...(p.idImagenPrincipal === null
                        ? {}
                        : { imageUrl: busquedaApi.urlImagen(p.idImagenPrincipal, 'miniatura') })}
                      className="h-full w-full"
                    />

                    {/* Badge de coincidencia de color si aplica (B7/B8) */}
                    {p.coincidenciaColor && (
                      <div className="absolute top-2 left-2 z-10 flex items-center gap-1 rounded-full bg-corporate/90 px-2 py-0.5 text-[10px] font-semibold text-neutral-white shadow-xs backdrop-blur-xs">
                        <Sparkles className="h-3 w-3 text-subaction" />
                        <span>{p.coincidenciaColor}</span>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Paginador */}
          {resultado !== null && (
            <Paginador paginacion={resultado.paginacion} onCambiar={(pagina) => aplicar({ pagina })} />
          )}

          {/* Tarjeta de asesoría directa de M15 */}
          <div className="rounded-card border border-neutral-light bg-neutral-white p-5 shadow-xs">
            <h2 className="font-title text-base font-semibold text-corporate">
              ¿No sabes cuál elegir?
            </h2>
            <p className="mt-1 mb-3 font-sans text-sm text-neutral-dark">
              Escríbele a un asesor experto y te orientamos según tu superficie, tipo de acabado y presupuesto.
            </p>
            <BotonContactoDirecto referencia="Escribo desde la búsqueda del catálogo de productos." />
          </div>
        </div>
      </div>
    </Container>
  );
};
