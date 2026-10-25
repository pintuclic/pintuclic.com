'use client';

import { useEffect, useMemo, useState } from 'react';
import { Package } from 'lucide-react';
import { AdminPageHeader, Alert, Skeleton } from '@/core/components';
import type { EstadoOrden } from '../../dtos/m08-ordenes.dto';
import { ESTADOS_EN_CURSO, ETIQUETA_ESTADO } from '../../services/presentacion';
import { hayFiltrosActivos, useGestionStore } from '../../store/gestionStore';
import { FiltroPildoras, type OpcionPildora } from '../FiltroPildoras';
import { PaginacionPedidos } from '../PaginacionPedidos';
import { FilaBandeja } from './FilaBandeja';
import { FiltrosBandejaForm } from './FiltrosBandejaForm';

type FiltroEstado = 'todos' | EstadoOrden;

/**
 * HU-ORD-05 y HU-ORD-08 · Bandeja de pedidos, organizada como «Mis pedidos» del cliente: filtro en
 * píldoras por estado (con cuántos esperan en cada uno) y tarjetas de pedido. Sin búsqueda muestra las
 * órdenes en curso, la que más lleva esperando primero dentro de cada estado; con búsqueda, los
 * resultados paginados.
 */
export function BandejaView() {
  const { grupos, resultados, paginacion, resumen, filtros, cargando, error } = useGestionStore();
  const { cargarBandeja, cargarResumen, establecerFiltros, limpiarFiltros, establecerPagina } = useGestionStore.getState();
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todos');

  useEffect(() => {
    void cargarBandeja();
    void cargarResumen();
  }, [cargarBandeja, cargarResumen]);

  const buscando = hayFiltrosActivos(filtros);

  const opciones = useMemo<ReadonlyArray<OpcionPildora<FiltroEstado>>>(() => {
    const cuantas = new Map(grupos.map((g) => [g.estado, g.ordenes.length]));
    const pendientes = new Map(resumen.map((r) => [r.estado, r.cantidad]));
    const cantidad = (estado: EstadoOrden): number => pendientes.get(estado) ?? cuantas.get(estado) ?? 0;
    return [
      {
        valor: 'todos',
        etiqueta: 'Todos',
        icono: <Package className="h-3.5 w-3.5" aria-hidden="true" />,
        cantidad: ESTADOS_EN_CURSO.reduce((suma, estado) => suma + cantidad(estado), 0),
      },
      ...ESTADOS_EN_CURSO.map((estado) => ({ valor: estado, etiqueta: ETIQUETA_ESTADO[estado], cantidad: cantidad(estado) })),
    ];
  }, [grupos, resumen]);

  // Las órdenes en curso, ya ordenadas por estado y por antigüedad dentro de cada uno.
  const visibles = grupos
    .filter((g) => filtroEstado === 'todos' || g.estado === filtroEstado)
    .flatMap((g) => g.ordenes);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Pedidos"
        subtitle="Atienda primero los pedidos que llevan más tiempo esperando. Cualquier compañero con permiso puede operar cualquier pedido."
      />

      <FiltrosBandejaForm
        deshabilitado={cargando}
        onBuscar={(f) => void establecerFiltros(f)}
        onLimpiar={() => void limpiarFiltros()}
      />

      {!buscando && (
        <FiltroPildoras opciones={opciones} valor={filtroEstado} onCambiar={setFiltroEstado} ariaLabel="Filtrar pedidos por estado" />
      )}

      {error && <Alert variant="error">{error}</Alert>}

      {cargando && grupos.length === 0 && resultados.length === 0 ? (
        <div className="space-y-4" aria-busy="true" aria-label="Cargando pedidos">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : buscando ? (
        <section aria-label="Resultados de la búsqueda" className="space-y-4">
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
        <ul className="space-y-4" aria-busy={cargando}>
          {visibles.map((orden) => (
            <li key={orden.codigo}>
              <FilaBandeja orden={orden} />
            </li>
          ))}
          {!cargando && !error && visibles.length === 0 && (
            <li className="rounded-card bg-neutral-white p-6 text-center text-sm text-neutral-medium shadow-card">
              {filtroEstado === 'todos'
                ? 'No hay pedidos esperando.'
                : `No hay pedidos en «${ETIQUETA_ESTADO[filtroEstado]}».`}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
