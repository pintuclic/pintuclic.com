'use client';

import { useEffect } from 'react';
import { Alert, AdminPageHeader, Skeleton } from '@/core/components';
import { hayFiltrosActivos, useGestionStore } from '../../store/gestionStore';
import { ETIQUETA_ESTADO } from '../../services/presentacion';
import { PaginacionPedidos } from '../PaginacionPedidos';
import { FilaBandeja } from './FilaBandeja';
import { FiltrosBandejaForm } from './FiltrosBandejaForm';

/**
 * HU-ORD-05 y HU-ORD-08 · Bandeja de pedidos. Sin filtros muestra las órdenes en curso agrupadas por
 * estado, la que más lleva esperando primero; con filtros, una búsqueda paginada.
 */
export function BandejaView() {
  const { grupos, resultados, paginacion, resumen, filtros, cargando, error } = useGestionStore();
  const { cargarBandeja, cargarResumen, establecerFiltros, limpiarFiltros, establecerPagina } = useGestionStore.getState();

  useEffect(() => {
    void cargarBandeja();
    void cargarResumen();
  }, [cargarBandeja, cargarResumen]);

  const buscando = hayFiltrosActivos(filtros);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Pedidos"
        subtitle="Atienda primero los pedidos que llevan más tiempo esperando. Cualquier compañero con permiso puede operar cualquier pedido."
      />

      <ul aria-label="Pedidos esperando por estado" className="flex flex-wrap gap-2">
        {resumen.map((r) => (
          <li
            key={r.estado}
            className="rounded-full border border-neutral-light bg-neutral-white px-3 py-1 font-title text-xs text-neutral-dark"
          >
            {ETIQUETA_ESTADO[r.estado]}: <strong className="text-corporate">{r.cantidad}</strong>
          </li>
        ))}
      </ul>

      <FiltrosBandejaForm
        deshabilitado={cargando}
        onBuscar={(f) => void establecerFiltros(f)}
        onLimpiar={() => void limpiarFiltros()}
      />

      {error && <Alert variant="error">{error}</Alert>}

      {cargando && grupos.length === 0 && resultados.length === 0 ? (
        <div className="space-y-3" aria-busy="true" aria-label="Cargando pedidos">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : buscando ? (
        <section aria-label="Resultados de la búsqueda" className="space-y-3">
          {resultados.length === 0 ? (
            <p className="rounded-card bg-neutral-white p-6 text-center text-sm text-neutral-medium shadow-card">
              No encontramos pedidos con esos datos.
            </p>
          ) : (
            resultados.map((orden) => <FilaBandeja key={orden.codigo} orden={orden} />)
          )}
          {paginacion && (
            <PaginacionPedidos
              pagina={paginacion.pagina}
              totalPaginas={paginacion.totalPaginas}
              onCambiar={(p) => void establecerPagina(p)}
            />
          )}
        </section>
      ) : (
        <div className="space-y-6">
          {grupos.map((grupo) => (
            <section key={grupo.estado} aria-labelledby={`grupo-${grupo.estado}`} className="space-y-2">
              <h2 id={`grupo-${grupo.estado}`} className="font-title text-base font-bold text-neutral-black">
                {ETIQUETA_ESTADO[grupo.estado]} <span className="text-sm font-medium text-neutral-medium">({grupo.ordenes.length})</span>
              </h2>
              {grupo.ordenes.length === 0 ? (
                <p className="text-sm text-neutral-medium">No hay pedidos en este estado.</p>
              ) : (
                grupo.ordenes.map((orden) => <FilaBandeja key={orden.codigo} orden={orden} />)
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
