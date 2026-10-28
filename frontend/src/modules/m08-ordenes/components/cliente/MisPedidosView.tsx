'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, CircleCheck, Clock, Package, Search } from 'lucide-react';
import { Alert, Button, ButtonLink, Container, Skeleton } from '@/core/components';
import type { FiltroEstadoPedidos } from '../../interfaces/ordenes.interface';
import { pedidosVisibles, useMisPedidosStore } from '../../store/misPedidosStore';
import { FiltroPildoras, type OpcionPildora } from '../FiltroPildoras';
import { PaginacionPedidos } from '../PaginacionPedidos';
import { PedidoCard } from './PedidoCard';

const FILTROS: ReadonlyArray<OpcionPildora<FiltroEstadoPedidos>> = [
  { valor: 'todos', etiqueta: 'Todos', icono: <Package className="h-3.5 w-3.5" aria-hidden="true" /> },
  { valor: 'en_curso', etiqueta: 'En curso', icono: <Clock className="h-3.5 w-3.5" aria-hidden="true" /> },
  { valor: 'finalizados', etiqueta: 'Finalizados', icono: <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" /> },
];

/**
 * HU-ORD-07 · «Mis pedidos». Lista del cliente titular con búsqueda, separación entre en curso y
 * finalizados (R12) y paginación. Solo muestra lo que el contrato entrega: identificador, fecha,
 * total y estado.
 */
export function MisPedidosView() {
  const { enCurso, finalizados, filtro, busqueda, pagina, totalPaginas, cargando, error } = useMisPedidosStore();
  const { cargar, establecerFiltro, establecerBusqueda, establecerPagina } = useMisPedidosStore.getState();
  const [texto, setTexto] = useState(busqueda);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const visibles = pedidosVisibles(enCurso, finalizados, filtro);

  const buscar = (evento: FormEvent) => {
    evento.preventDefault();
    void establecerBusqueda(texto);
  };

  return (
    <div className="bg-neutral-lightest py-8">
      <Container>
        <div className="mx-auto max-w-3xl space-y-4">
          <ButtonLink href="/perfil" variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Mi cuenta
          </ButtonLink>
          <h1 className="font-title text-2xl font-bold text-neutral-black">Mis pedidos</h1>

          <form onSubmit={buscar} role="search" className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-medium" aria-hidden="true" />
              <input
                type="search"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                aria-label="Buscar por número de pedido o producto"
                placeholder="Buscar por número de pedido o producto"
                maxLength={100}
                className="min-h-[44px] w-full rounded-input border border-neutral-light bg-neutral-white py-2.5 pl-9 pr-3 font-sans text-sm text-neutral-dark placeholder:text-neutral-medium focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
              />
            </div>
            <Button type="submit" variant="primary-action">
              Buscar
            </Button>
          </form>

          <FiltroPildoras opciones={FILTROS} valor={filtro} onCambiar={establecerFiltro} ariaLabel="Filtrar pedidos" />

          {error && (
            <Alert variant="error" title="No pudimos cargar tus pedidos">
              <p>{error}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => void cargar()}>
                Reintentar
              </Button>
            </Alert>
          )}

          {cargando && visibles.length === 0 && !error ? (
            <div className="space-y-4" aria-busy="true" aria-label="Cargando pedidos">
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
            </div>
          ) : (
            <ul className="space-y-4" aria-busy={cargando}>
              {visibles.map((pedido) => (
                <li key={pedido.codigo}>
                  <PedidoCard pedido={pedido} />
                </li>
              ))}
            </ul>
          )}

          {!cargando && !error && visibles.length === 0 && (
            <p className="rounded-card bg-neutral-white p-6 text-center font-sans text-sm text-neutral-medium shadow-card">
              {busqueda.trim() !== ''
                ? 'No encontramos pedidos con esa búsqueda.'
                : filtro === 'todos'
                  ? 'Aún no tienes pedidos.'
                  : 'No tienes pedidos en este grupo.'}
            </p>
          )}

          <PaginacionPedidos pagina={pagina} totalPaginas={totalPaginas} onCambiar={(p) => void establecerPagina(p)} />
        </div>
      </Container>
    </div>
  );
}
