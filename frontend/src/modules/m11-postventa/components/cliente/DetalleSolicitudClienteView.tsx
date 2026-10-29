'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Alert, ButtonLink, Container, Skeleton } from '@/core/components';
import { obtenerMiSolicitud } from '../../services/postventa-api';
import {
  ETIQUETA_ESTADO_POSTVENTA,
  ETIQUETA_METODO_REEMBOLSO,
  ETIQUETA_TIPO_POSTVENTA,
  formatearFecha,
  formatearMoneda,
} from '../../services/presentacion';
import { EstadoPostventaBadge } from '../EstadoPostventaBadge';
import type { SolicitudPostventaDetalle } from '../../dtos/m11-postventa.dto';

export function DetalleSolicitudClienteView({ codigo }: { codigo: string }) {
  const [solicitud, setSolicitud] = useState<SolicitudPostventaDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    obtenerMiSolicitud(codigo)
      .then((data) => {
        if (activo) {
          setSolicitud(data);
          setCargando(false);
        }
      })
      .catch((err: unknown) => {
        if (activo) {
          setError(
            err instanceof Error ? err.message : 'No pudimos consultar esta solicitud'
          );
          setCargando(false);
        }
      });

    return () => {
      activo = false;
    };
  }, [codigo]);

  return (
    <div className="bg-neutral-lightest min-h-screen py-8">
      <Container>
        <div className="mx-auto max-w-3xl space-y-4">
          <ButtonLink
            href="/perfil/devoluciones"
            variant="ghost"
            size="sm"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Mis solicitudes
          </ButtonLink>

          {error && (
            <Alert variant="error" title="No pudimos cargar la solicitud">
              {error}
            </Alert>
          )}

          {cargando && (
            <div className="space-y-4" aria-busy="true">
              <Skeleton className="h-28 rounded-card" />
              <Skeleton className="h-48 rounded-card" />
            </div>
          )}

          {!cargando && solicitud && (
            <>
              {/* Header */}
              <header className="rounded-card bg-neutral-white p-5 shadow-card space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h1 className="font-title text-xl font-bold text-neutral-black">
                      Solicitud {solicitud.codigo}
                    </h1>
                    <p className="text-xs text-neutral-medium">
                      Radicada el {formatearFecha(solicitud.fechaSolicitud)} ·{' '}
                      {ETIQUETA_TIPO_POSTVENTA[solicitud.tipo]}
                    </p>
                  </div>
                  <EstadoPostventaBadge estado={solicitud.estado} />
                </div>

                <div className="text-sm pt-2 text-neutral-dark border-t border-neutral-light flex flex-wrap justify-between items-center gap-2">
                  <span>
                    Pedido asociado:{' '}
                    <Link
                      href={`/perfil/pedidos/${solicitud.codigoOrden}`}
                      className="font-bold text-primary-600 hover:underline"
                    >
                      #{solicitud.codigoOrden}
                    </Link>
                  </span>
                  <span className="font-bold text-base text-neutral-black">
                    Total reembolso: {formatearMoneda(solicitud.totalReembolso)}
                  </span>
                </div>
              </header>

              {/* Status explanation */}
              {solicitud.estado === 'rechazada' && (
                <Alert
                  variant="error"
                  title="Solicitud rechazada"
                >
                  <p className="text-sm">
                    {solicitud.observacionesResolucion ||
                      'La solicitud no cumplió con las condiciones de la política de devoluciones.'}
                  </p>
                </Alert>
              )}

              {solicitud.estado === 'reembolsada' && (
                <div className="rounded-card bg-emerald-50 border border-emerald-200 p-4 text-emerald-900 space-y-2 shadow-card">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <span>Reembolso completado exitosamente</span>
                  </div>
                  <p className="text-xs">
                    Método:{' '}
                    <strong>
                      {solicitud.metodoReembolso
                        ? ETIQUETA_METODO_REEMBOLSO[solicitud.metodoReembolso]
                        : 'Transferencia'}
                    </strong>{' '}
                    · Referencia: <strong>{solicitud.referenciaReembolso}</strong>
                  </p>
                  {solicitud.comprobanteUrl && (
                    <a
                      href={solicitud.comprobanteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-xs text-emerald-700 underline font-semibold mt-1"
                    >
                      Ver comprobante de pago
                    </a>
                  )}
                </div>
              )}

              {/* General Reason */}
              <section className="rounded-card bg-neutral-white p-5 shadow-card space-y-2">
                <h2 className="text-sm font-bold text-neutral-black">
                  Motivo manifestado
                </h2>
                <p className="text-sm text-neutral-dark bg-neutral-lightest p-3 rounded-lg border border-neutral-light">
                  {solicitud.motivoGeneral}
                </p>
              </section>

              {/* Products List */}
              <section className="rounded-card bg-neutral-white p-5 shadow-card space-y-3">
                <h2 className="text-sm font-bold text-neutral-black">
                  Productos incluidos ({solicitud.totalItems} ítems)
                </h2>
                <div className="divide-y divide-neutral-light border border-neutral-light rounded-lg">
                  {solicitud.lineas.map((l) => (
                    <div
                      key={l.idLineaPostventa}
                      className="p-3 flex flex-wrap justify-between items-start gap-2"
                    >
                      <div>
                        <div className="font-semibold text-sm text-neutral-black">
                          {l.nombreProducto}
                        </div>
                        <div className="text-xs text-neutral-medium">
                          {l.varianteCopia} · Cantidad solicitada: {l.cantidad}
                        </div>
                        {l.esEntonado && (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            Color entonado / a medida
                          </span>
                        )}
                        {l.motivoEspecifico && (
                          <div className="text-xs text-neutral-dark mt-1 italic">
                            Nota: &quot;{l.motivoEspecifico}&quot;
                          </div>
                        )}
                      </div>
                      <div className="text-sm font-bold text-neutral-black">
                        {formatearMoneda(l.subTotal)}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Bank Details */}
              {solicitud.datosBancarios && (
                <section className="rounded-card bg-neutral-white p-5 shadow-card space-y-2">
                  <h2 className="text-sm font-bold text-neutral-black">
                    Datos bancarios para consignación
                  </h2>
                  <div className="text-xs text-neutral-dark grid grid-cols-1 sm:grid-cols-2 gap-2 bg-neutral-lightest p-3 rounded-lg border border-neutral-light">
                    <div>
                      Banco: <strong>{solicitud.datosBancarios.banco}</strong>
                    </div>
                    <div>
                      Tipo de cuenta:{' '}
                      <strong className="capitalize">
                        {solicitud.datosBancarios.tipoCuenta}
                      </strong>
                    </div>
                    <div>
                      No. Cuenta: <strong>{solicitud.datosBancarios.numeroCuenta}</strong>
                    </div>
                    <div>
                      Titular:{' '}
                      <strong>
                        {solicitud.datosBancarios.titularNombre} (Doc:{' '}
                        {solicitud.datosBancarios.titularDocumento})
                      </strong>
                    </div>
                  </div>
                </section>
              )}

              {/* Timeline */}
              <section className="rounded-card bg-neutral-white p-5 shadow-card space-y-3">
                <h2 className="text-sm font-bold text-neutral-black">
                  Historial y seguimiento
                </h2>
                <div className="space-y-3 pl-2 border-l-2 border-neutral-light ml-2">
                  {solicitud.historial.map((h) => (
                    <div key={h.idHistorial} className="relative pl-4 space-y-1">
                      <div className="absolute -left-[21px] top-1.5 h-3 w-3 rounded-full bg-primary-600 ring-4 ring-neutral-white" />
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-neutral-black uppercase">
                          {ETIQUETA_ESTADO_POSTVENTA[h.estadoNuevo]}
                        </span>
                        <span className="text-[11px] text-neutral-medium">
                          {formatearFecha(h.fecha)}
                        </span>
                      </div>
                      {h.motivo && (
                        <p className="text-xs text-neutral-dark">{h.motivo}</p>
                      )}
                      {h.nombreAutor && (
                        <p className="text-[11px] text-neutral-medium">
                          Por: {h.nombreAutor}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </Container>
    </div>
  );
}
