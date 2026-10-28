'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, PackageX } from 'lucide-react';
import { Alert, ButtonLink, Container, Skeleton } from '@/core/components';
import { listarMisSolicitudes } from '../../services/postventa-api';
import {
  ETIQUETA_TIPO_POSTVENTA,
  formatearFecha,
  formatearMoneda,
} from '../../services/presentacion';
import { EstadoPostventaBadge } from '../EstadoPostventaBadge';
import type { SolicitudPostventaResumen } from '../../dtos/m11-postventa.dto';

export function MisDevolucionesView() {
  const [items, setItems] = useState<SolicitudPostventaResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    listarMisSolicitudes()
      .then((res) => {
        if (activo) {
          setItems(res.items);
          setCargando(false);
        }
      })
      .catch((err: unknown) => {
        if (activo) {
          setError(
            err instanceof Error ? err.message : 'No pudimos cargar tus solicitudes'
          );
          setCargando(false);
        }
      });

    return () => {
      activo = false;
    };
  }, []);

  return (
    <div className="bg-neutral-lightest min-h-screen py-8">
      <Container>
        <div className="mx-auto max-w-3xl space-y-4">
          <ButtonLink
            href="/perfil/pedidos"
            variant="ghost"
            size="sm"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Volver a mis pedidos
          </ButtonLink>

          <header className="rounded-card bg-neutral-white p-5 shadow-card">
            <h1 className="font-title text-2xl font-bold text-neutral-black">
              Devoluciones y Cancelaciones
            </h1>
            <p className="text-sm text-neutral-medium mt-1">
              Consulta el estado de tus solicitudes de retracto legal, reclamaciones por
              garantía y cancelaciones.
            </p>
          </header>

          {error && (
            <Alert variant="error" title="Error al cargar solicitudes">
              {error}
            </Alert>
          )}

          {cargando && (
            <div className="space-y-3" aria-busy="true">
              <Skeleton className="h-24 rounded-card" />
              <Skeleton className="h-24 rounded-card" />
            </div>
          )}

          {!cargando && items.length === 0 && (
            <div className="rounded-card bg-neutral-white p-8 text-center space-y-3 shadow-card">
              <PackageX className="h-12 w-12 text-neutral-medium mx-auto" />
              <h2 className="text-base font-bold text-neutral-dark">
                No tienes solicitudes de postventa radicadas
              </h2>
              <p className="text-sm text-neutral-medium max-w-md mx-auto">
                Si requieres cancelar un pedido en preparación o solicitar la devolución de
                un producto entregado, puedes gestionarlo desde el detalle de tu pedido.
              </p>
              <div className="pt-2">
                <ButtonLink href="/perfil/pedidos" variant="primary-action" size="sm">
                  Ver mis pedidos
                </ButtonLink>
              </div>
            </div>
          )}

          {!cargando && items.length > 0 && (
            <div className="space-y-3">
              {items.map((item) => (
                <Link
                  key={item.idSolicitud}
                  href={`/perfil/devoluciones/${item.codigo}`}
                  className="block rounded-card bg-neutral-white p-4 shadow-card hover:border-primary-300 border border-transparent transition-all"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-neutral-black text-base">
                          {item.codigo}
                        </span>
                        <EstadoPostventaBadge estado={item.estado} />
                      </div>
                      <p className="text-xs text-neutral-medium mt-1">
                        Pedido asociado: #{item.codigoOrden} ·{' '}
                        {ETIQUETA_TIPO_POSTVENTA[item.tipo]}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-bold text-neutral-black">
                        {formatearMoneda(item.totalReembolso)}
                      </div>
                      <div className="text-xs text-neutral-medium flex items-center justify-end gap-1 mt-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{formatearFecha(item.fechaSolicitud)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}
