'use client';

import React from 'react';
import { Check } from 'lucide-react';
import type { OpcionesFiltro } from '../dtos/busqueda.dto';
import type { FiltrosBusqueda } from '../services/filtros-busqueda';

interface Props {
  filtros: FiltrosBusqueda;
  opciones: OpcionesFiltro | null;
  onCambiar: (cambios: Partial<FiltrosBusqueda>) => void;
}

export const BusquedaFiltrosSidebar: React.FC<Props> = ({
  filtros,
  opciones,
  onCambiar,
}) => {
  const toggleArrayItem = (array: number[], item: number): number[] => {
    return array.includes(item) ? array.filter((id) => id !== item) : [...array, item];
  };

  const formatearPrecio = (valor: number): string => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(valor);
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="border-b border-neutral-light pb-3">
        <h2 className="font-title text-base font-semibold text-corporate">Filtros</h2>
      </div>

      {/* Categorías y Subcategorías en Árbol Jerárquico (Estilo Imagen 3) */}
      {opciones && opciones.categorias.length > 0 && (
        <section aria-labelledby="filtro-categorias">
          <h3 id="filtro-categorias" className="mb-2 font-title text-sm font-semibold text-neutral-dark">
            Categorías
          </h3>
          <ul className="space-y-1">
            {opciones.categorias.map((cat) => {
              const catActiva = filtros.idCategoria.includes(cat.id);
              const subcatsDeCat = opciones.subcategorias.filter((s) => s.idCategoria === cat.id);
              const tieneSubcatSeleccionada = subcatsDeCat.some((s) => filtros.idSubcategoria.includes(s.id));
              const mostrarSubcategorias = catActiva || tieneSubcatSeleccionada;

              return (
                <li key={cat.id}>
                  {/* Botón de Categoría */}
                  <button
                    type="button"
                    aria-pressed={catActiva}
                    onClick={() => {
                      if (catActiva) {
                        // Desactivar categoría y sus subcategorías
                        const idsSubEliminar = subcatsDeCat.map((s) => s.id);
                        onCambiar({
                          idCategoria: filtros.idCategoria.filter((id) => id !== cat.id),
                          idSubcategoria: filtros.idSubcategoria.filter((id) => !idsSubEliminar.includes(id)),
                          pagina: 1,
                        });
                      } else {
                        // Activar categoría
                        onCambiar({
                          idCategoria: [...filtros.idCategoria, cat.id],
                          pagina: 1,
                        });
                      }
                    }}
                    className={`flex w-full items-center justify-between rounded-btn px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-neutral-lightest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50 ${
                      catActiva
                        ? 'font-semibold text-action'
                        : 'text-neutral-dark hover:text-neutral-black'
                    }`}
                  >
                    <span className="truncate">{cat.nombre}</span>
                    <span className="ml-2 text-xs text-neutral-medium">({cat.total})</span>
                  </button>

                  {/* Subcategorías anidadas con línea lateral izquierda (Imagen 3) */}
                  {mostrarSubcategorias && subcatsDeCat.length > 0 && (
                    <ul className="my-1 ml-3 space-y-0.5 border-l-2 border-subaction pl-3">
                      {subcatsDeCat.map((sub) => {
                        const subActiva = filtros.idSubcategoria.includes(sub.id);
                        return (
                          <li key={sub.id}>
                            <button
                              type="button"
                              aria-pressed={subActiva}
                              onClick={() => {
                                const nuevaSub = toggleArrayItem(filtros.idSubcategoria, sub.id);
                                const nuevaCat = filtros.idCategoria.includes(cat.id)
                                  ? filtros.idCategoria
                                  : [...filtros.idCategoria, cat.id];
                                onCambiar({
                                  idSubcategoria: nuevaSub,
                                  idCategoria: nuevaCat,
                                  pagina: 1,
                                });
                              }}
                              className={`flex w-full items-center justify-between rounded-btn px-2 py-1 text-left text-xs transition-colors hover:bg-neutral-lightest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50 ${
                                subActiva
                                  ? 'font-semibold text-action'
                                  : 'text-neutral-dark hover:text-neutral-black'
                              }`}
                            >
                              <span className="truncate">{sub.nombre}</span>
                              <span className="ml-1 text-[11px] text-neutral-medium">({sub.total})</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Marcas */}
      {opciones && opciones.marcas.length > 0 && (
        <section aria-labelledby="filtro-marcas">
          <h3 id="filtro-marcas" className="mb-2 font-title text-sm font-semibold text-neutral-dark">
            Marcas
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {opciones.marcas.map((m) => {
              const activa = filtros.idMarca.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={activa}
                  onClick={() =>
                    onCambiar({
                      idMarca: toggleArrayItem(filtros.idMarca, m.id),
                      pagina: 1,
                    })
                  }
                  className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50 ${
                    activa
                      ? 'border-action bg-action text-neutral-white shadow-xs'
                      : 'border-neutral-light bg-neutral-white text-neutral-dark hover:border-action/50'
                  }`}
                >
                  <span>{m.nombre}</span>
                  <span className={`text-[10px] ${activa ? 'text-neutral-white/80' : 'text-neutral-medium'}`}>
                    ({m.total})
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Líneas (si hay) */}
      {opciones && opciones.lineas.length > 0 && (
        <section aria-labelledby="filtro-lineas">
          <h3 id="filtro-lineas" className="mb-2 font-title text-sm font-semibold text-neutral-dark">
            Líneas
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {opciones.lineas.map((l) => {
              const activa = filtros.idLinea.includes(l.id);
              return (
                <button
                  key={l.id}
                  type="button"
                  aria-pressed={activa}
                  onClick={() =>
                    onCambiar({
                      idLinea: toggleArrayItem(filtros.idLinea, l.id),
                      pagina: 1,
                    })
                  }
                  className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50 ${
                    activa
                      ? 'border-action bg-action text-neutral-white shadow-xs'
                      : 'border-neutral-light bg-neutral-white text-neutral-dark hover:border-action/50'
                  }`}
                >
                  <span>{l.nombre}</span>
                  <span className={`text-[10px] ${activa ? 'text-neutral-white/80' : 'text-neutral-medium'}`}>
                    ({l.total})
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Familias Cromáticas (Selector visual de color pulido sin bordes invasivos) */}
      {opciones && opciones.familiasColor.length > 0 && (
        <section aria-labelledby="filtro-familias-color">
          <h3 id="filtro-familias-color" className="mb-2 font-title text-sm font-semibold text-neutral-dark">
            Familias de color
          </h3>
          <div className="grid grid-cols-4 gap-x-2 gap-y-3">
            {opciones.familiasColor.map((fam) => {
              const activa = filtros.idFamiliaColor.includes(fam.id);
              const esColorClaro = ['#ffffff', '#fff', '#f3e5ab', '#ffe57f'].includes(
                fam.hexadecimal.toLowerCase(),
              );

              return (
                <button
                  key={fam.id}
                  type="button"
                  title={`${fam.nombre} (${fam.total})`}
                  aria-label={`${fam.nombre} (${fam.total} productos)`}
                  aria-pressed={activa}
                  onClick={() =>
                    onCambiar({
                      idFamiliaColor: toggleArrayItem(filtros.idFamiliaColor, fam.id),
                      pagina: 1,
                    })
                  }
                  className="group flex flex-col items-center justify-start p-1 rounded-btn transition-colors hover:bg-neutral-lightest/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50"
                >
                  {/* Círculo de color con ring elegante cuando está activo */}
                  <span
                    className={`relative flex h-8 w-8 items-center justify-center rounded-full transition-all ${
                      activa
                        ? 'ring-2 ring-action ring-offset-2 scale-105 shadow-sm'
                        : 'border border-neutral-light hover:scale-105 shadow-2xs'
                    }`}
                    style={{ backgroundColor: fam.hexadecimal }}
                  >
                    {activa && (
                      <Check
                        className={`h-4 w-4 drop-shadow-[0_1px_1px_rgba(0,0,0,0.7)] ${
                          esColorClaro ? 'text-neutral-black' : 'text-neutral-white'
                        }`}
                      />
                    )}
                  </span>

                  {/* Texto de la familia legible con salto de línea si es necesario */}
                  <span
                    className={`mt-1.5 text-center text-[11px] leading-tight transition-colors line-clamp-2 max-w-full ${
                      activa ? 'font-semibold text-action' : 'font-medium text-neutral-dark'
                    }`}
                  >
                    {fam.nombre}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Presentaciones / Medidas */}
      {opciones && opciones.presentaciones.length > 0 && (
        <section aria-labelledby="filtro-presentaciones">
          <h3 id="filtro-presentaciones" className="mb-2 font-title text-sm font-semibold text-neutral-dark">
            Presentación
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {opciones.presentaciones.map((pres) => {
              const activa = filtros.idMedida.includes(pres.id);
              return (
                <button
                  key={pres.id}
                  type="button"
                  aria-pressed={activa}
                  onClick={() =>
                    onCambiar({
                      idMedida: toggleArrayItem(filtros.idMedida, pres.id),
                      pagina: 1,
                    })
                  }
                  className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50 ${
                    activa
                      ? 'border-action bg-action text-neutral-white shadow-xs'
                      : 'border-neutral-light bg-neutral-white text-neutral-dark hover:border-action/50'
                  }`}
                >
                  <span>{pres.nombre}</span>
                  <span className={`text-[10px] ${activa ? 'text-neutral-white/80' : 'text-neutral-medium'}`}>
                    ({pres.total})
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Tipos de Resina */}
      {opciones && opciones.tiposResina.length > 0 && (
        <section aria-labelledby="filtro-resinas">
          <h3 id="filtro-resinas" className="mb-2 font-title text-sm font-semibold text-neutral-dark">
            Tipo de resina
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {opciones.tiposResina.map((res) => {
              const activa = filtros.idTipoResina.includes(res.id);
              return (
                <button
                  key={res.id}
                  type="button"
                  aria-pressed={activa}
                  onClick={() =>
                    onCambiar({
                      idTipoResina: toggleArrayItem(filtros.idTipoResina, res.id),
                      pagina: 1,
                    })
                  }
                  className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50 ${
                    activa
                      ? 'border-action bg-action text-neutral-white shadow-xs'
                      : 'border-neutral-light bg-neutral-white text-neutral-dark hover:border-action/50'
                  }`}
                >
                  <span>{res.nombre}</span>
                  <span className={`text-[10px] ${activa ? 'text-neutral-white/80' : 'text-neutral-medium'}`}>
                    ({res.total})
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Superficies */}
      {opciones && opciones.superficies.length > 0 && (
        <section aria-labelledby="filtro-superficies">
          <h3 id="filtro-superficies" className="mb-2 font-title text-sm font-semibold text-neutral-dark">
            Superficie
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {opciones.superficies.map((sup) => {
              const activa = filtros.idSuperficie.includes(sup.id);
              return (
                <button
                  key={sup.id}
                  type="button"
                  aria-pressed={activa}
                  onClick={() =>
                    onCambiar({
                      idSuperficie: toggleArrayItem(filtros.idSuperficie, sup.id),
                      pagina: 1,
                    })
                  }
                  className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50 ${
                    activa
                      ? 'border-action bg-action text-neutral-white shadow-xs'
                      : 'border-neutral-light bg-neutral-white text-neutral-dark hover:border-action/50'
                  }`}
                >
                  <span>{sup.nombre}</span>
                  <span className={`text-[10px] ${activa ? 'text-neutral-white/80' : 'text-neutral-medium'}`}>
                    ({sup.total})
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Ambiente */}
      <section aria-labelledby="filtro-ambiente">
        <h3 id="filtro-ambiente" className="mb-2 font-title text-sm font-semibold text-neutral-dark">
          Ambiente
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {(['interior', 'exterior'] as const).map((amb) => {
            const activa = filtros.ambiente === amb;
            return (
              <button
                key={amb}
                type="button"
                aria-pressed={activa}
                onClick={() =>
                  onCambiar({
                    ambiente: activa ? undefined : amb,
                    pagina: 1,
                  })
                }
                className={`rounded-btn border px-3 py-1.5 text-center text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50 ${
                  activa
                    ? 'border-action bg-action text-neutral-white font-semibold'
                    : 'border-neutral-light bg-neutral-white text-neutral-dark hover:border-action/50'
                }`}
              >
                {amb === 'interior' ? 'Interior' : 'Exterior'}
              </button>
            );
          })}
        </div>
      </section>

      {/* Rango de Precios */}
      {opciones && opciones.precio && (
        <section aria-labelledby="filtro-precio">
          <div className="mb-2 flex items-center justify-between">
            <h3 id="filtro-precio" className="font-title text-sm font-semibold text-neutral-dark">
              Rango de precio
            </h3>
            {(filtros.precioMin !== undefined || filtros.precioMax !== undefined) && (
              <button
                type="button"
                onClick={() => onCambiar({ precioMin: undefined, precioMax: undefined, pagina: 1 })}
                className="text-xs font-medium text-action transition-colors hover:text-action-hover focus-visible:outline-none"
              >
                Restablecer
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="precio-minimo-input" className="block text-[11px] text-neutral-medium">
                Mínimo
              </label>
              <input
                id="precio-minimo-input"
                type="number"
                placeholder={formatearPrecio(opciones.precio.minimo)}
                value={filtros.precioMin ?? ''}
                onChange={(e) =>
                  onCambiar({
                    precioMin: e.target.value ? Number(e.target.value) : undefined,
                    pagina: 1,
                  })
                }
                className="mt-0.5 w-full rounded-btn border border-neutral-light px-2 py-1 text-xs text-neutral-black focus:border-action focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="precio-maximo-input" className="block text-[11px] text-neutral-medium">
                Máximo
              </label>
              <input
                id="precio-maximo-input"
                type="number"
                placeholder={formatearPrecio(opciones.precio.maximo)}
                value={filtros.precioMax ?? ''}
                onChange={(e) =>
                  onCambiar({
                    precioMax: e.target.value ? Number(e.target.value) : undefined,
                    pagina: 1,
                  })
                }
                className="mt-0.5 w-full rounded-btn border border-neutral-light px-2 py-1 text-xs text-neutral-black focus:border-action focus:outline-none"
              />
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
