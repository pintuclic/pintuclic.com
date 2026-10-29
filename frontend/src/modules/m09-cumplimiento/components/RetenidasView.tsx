'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AdminPageHeader, Alert, Badge, Button, ButtonLink, Skeleton } from '@/core/components';
import { mensajeDeError } from '../services/mensaje-error';
import { formatearDuracion } from '@/modules/m08-ordenes/services/presentacion';
import { listarRetenidas, type RetenidasRespuesta } from '../services/cumplimiento-api';
import { ETIQUETA_ESTADO_LINEA, varianteLinea } from '../services/presentacion';

const POR_PAGINA = 20;

/** Una tarjeta por pedido detenido: quién es, cuánto lleva esperando y qué productos lo retienen. */
export function FilaRetenida({ fila }: { fila: RetenidasRespuesta['filas'][number] }) {
  return (
    <li className="rounded-card bg-neutral-white p-4 shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Link href={`/admin/pedidos/${encodeURIComponent(fila.codigo)}`} className="font-title text-base font-bold text-action hover:underline">
          {fila.codigo}
        </Link>
        <span className="text-xs text-neutral-medium">Lleva {formatearDuracion(fila.segundosEnEstado)} en revisión</span>
      </div>
      <p className="mt-1 text-sm text-neutral-dark">
        {fila.cliente} · faltan {fila.lineasSinConfirmar} de {fila.lineasTotales}{' '}
        {fila.lineasTotales === 1 ? 'producto' : 'productos'}
      </p>
      <ul className="mt-3 space-y-1.5">
        {fila.motivos.map((motivo) => (
          <li key={`${motivo.descripcion}-${motivo.estado}`} className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="min-w-0 text-neutral-black">{motivo.descripcion}</span>
            <Badge variant={varianteLinea(motivo.estado)} pill>
              {ETIQUETA_ESTADO_LINEA[motivo.estado]}
            </Badge>
          </li>
        ))}
      </ul>
    </li>
  );
}

/** HU-CUM-03 · Los pedidos que no pueden avanzar a preparación y el motivo de cada uno. */
export function RetenidasView() {
  const [pagina, setPagina] = useState(1);
  const [datos, setDatos] = useState<RetenidasRespuesta | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async (p: number) => {
    setError(null);
    try {
      setDatos(await listarRetenidas(p, POR_PAGINA));
    } catch (err: unknown) {
      setError(mensajeDeError(err));
    }
  }, []);

  useEffect(() => {
    void cargar(pagina);
  }, [pagina, cargar]);

  const total = datos?.paginacion.total ?? 0;
  const paginas = datos?.paginacion.totalPaginas ?? 0;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Pedidos detenidos por disponibilidad"
        subtitle="Pedidos con productos que aún no están disponibles. Los que llevan más tiempo esperando van primero."
        actions={
          <ButtonLink href="/admin/pedidos" variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Volver a pedidos
          </ButtonLink>
        }
      />

      {error && <Alert variant="error">{error}</Alert>}
      {datos === null && error === null && (
        <div className="space-y-3" aria-busy="true" aria-label="Cargando pedidos detenidos">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      )}

      {datos !== null && datos.filas.length === 0 && <Alert variant="success">No hay pedidos detenidos por disponibilidad.</Alert>}

      {datos !== null && datos.filas.length > 0 && (
        <>
          <p className="text-sm text-neutral-medium" aria-live="polite">
            {total} {total === 1 ? 'pedido detenido' : 'pedidos detenidos'}
          </p>
          <ul className="space-y-3">
            {datos.filas.map((fila) => (
              <FilaRetenida key={fila.codigo} fila={fila} />
            ))}
          </ul>
          {paginas > 1 && (
            <nav aria-label="Paginación" className="flex items-center justify-between gap-3">
              <Button variant="outline" size="sm" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
                Anterior
              </Button>
              <span className="text-sm text-neutral-medium">
                Página {pagina} de {paginas}
              </span>
              <Button variant="outline" size="sm" disabled={pagina >= paginas} onClick={() => setPagina((p) => p + 1)}>
                Siguiente
              </Button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
