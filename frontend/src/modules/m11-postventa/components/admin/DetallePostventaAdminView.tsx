'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, ShieldCheck, Wallet } from 'lucide-react';
import {
  AdminPageHeader,
  Alert,
  Button,
  ButtonLink,
  Skeleton,
} from '@/core/components';
import { obtenerGestionPorCodigo } from '../../services/postventa-api';
import {
  ETIQUETA_ESTADO_POSTVENTA,
  ETIQUETA_METODO_REEMBOLSO,
  ETIQUETA_TIPO_POSTVENTA,
  formatearFecha,
  formatearMoneda,
} from '../../services/presentacion';
import { EstadoPostventaBadge } from '../EstadoPostventaBadge';
import { ModalResolverPostventa } from './ModalResolverPostventa';
import { ModalRegistrarReembolso } from './ModalRegistrarReembolso';
import type { SolicitudPostventaDetalle } from '../../dtos/m11-postventa.dto';

export function DetallePostventaAdminView({ codigo }: { codigo: string }) {
  const [solicitud, setSolicitud] = useState<SolicitudPostventaDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalResolverAbierto, setModalResolverAbierto] = useState(false);
  const [modalReembolsoAbierto, setModalReembolsoAbierto] = useState(false);

  const cargar = () => {
    setCargando(true);
    setError(null);
    obtenerGestionPorCodigo(codigo)
      .then((data) => {
        setSolicitud(data);
        setCargando(false);
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudo cargar el detalle de la solicitud'
        );
        setCargando(false);
      });
  };

  useEffect(() => {
    cargar();
  }, [codigo]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <ButtonLink
          href="/admin/postventa"
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft className="h-4 w-4" />}
        >
          Bandeja de postventa
        </ButtonLink>

        {solicitud && (
          <div className="flex items-center gap-3">
            {['solicitada', 'en_revision'].includes(solicitud.estado) && (
              <Button
                variant="primary-action"
                size="sm"
                onClick={() => setModalResolverAbierto(true)}
                leftIcon={<ShieldCheck className="h-4 w-4" />}
              >
                Resolver Solicitud
              </Button>
            )}

            {solicitud.estado === 'aprobada' && (
              <Button
                variant="primary-action"
                size="sm"
                onClick={() => setModalReembolsoAbierto(true)}
                leftIcon={<Wallet className="h-4 w-4" />}
              >
                Registrar Reembolso
              </Button>
            )}
          </div>
        )}
      </div>

      {error && (
        <Alert variant="error" title="Error de lectura">
          {error}
        </Alert>
      )}

      {cargando && (
        <div className="space-y-4" aria-busy="true">
          <Skeleton className="h-32 rounded-card" />
          <Skeleton className="h-48 rounded-card" />
        </div>
      )}

      {!cargando && solicitud && (
        <>
          {/* Header Card */}
          <div className="rounded-card bg-neutral-white p-5 shadow-card space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-medium">
                  {ETIQUETA_TIPO_POSTVENTA[solicitud.tipo]}
                </span>
                <h1 className="text-2xl font-bold text-neutral-black">
                  Solicitud {solicitud.codigo}
                </h1>
                <p className="text-sm text-neutral-dark mt-0.5">
                  Cliente: <strong>{solicitud.nombreCliente}</strong> (ID:{' '}
                  {solicitud.idCliente}) · Pedido:{' '}
                  <Link
                    href={`/admin/pedidos/${solicitud.codigoOrden}`}
                    className="font-bold text-primary-600 hover:underline"
                  >
                    #{solicitud.codigoOrden}
                  </Link>
                </p>
              </div>

              <div className="text-right space-y-1">
                <EstadoPostventaBadge estado={solicitud.estado} className="text-sm" />
                <div className="text-xl font-bold text-neutral-black">
                  {formatearMoneda(solicitud.totalReembolso)}
                </div>
                <div className="text-xs text-neutral-medium">
                  Radicada: {formatearFecha(solicitud.fechaSolicitud)}
                </div>
              </div>
            </div>

            {/* Resolved info */}
            {solicitud.fechaResolucion && (
              <div className="text-xs text-neutral-dark bg-neutral-lightest p-3 rounded-lg border border-neutral-light flex flex-wrap justify-between gap-2">
                <span>
                  Resuelta por: <strong>{solicitud.nombreEmpleadoResuelve ?? 'Personal autorizado'}</strong> el{' '}
                  {formatearFecha(solicitud.fechaResolucion)}
                </span>
                {solicitud.observacionesResolucion && (
                  <span className="italic">
                    &quot;{solicitud.observacionesResolucion}&quot;
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Refund Registered banner */}
          {solicitud.estado === 'reembolsada' && (
            <div className="rounded-card bg-emerald-50 border border-emerald-200 p-4 text-emerald-900 space-y-2 shadow-card">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span>Reembolso Liquidado</span>
              </div>
              <p className="text-xs">
                Método:{' '}
                <strong>
                  {solicitud.metodoReembolso
                    ? ETIQUETA_METODO_REEMBOLSO[solicitud.metodoReembolso]
                    : 'Transferencia'}
                </strong>{' '}
                · Referencia de pago: <strong>{solicitud.referenciaReembolso}</strong> · Fecha:{' '}
                {solicitud.fechaReembolso && formatearFecha(solicitud.fechaReembolso)}
              </p>
              {solicitud.comprobanteUrl && (
                <a
                  href={solicitud.comprobanteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-xs font-semibold text-emerald-700 underline mt-1"
                >
                  Abrir comprobante externo
                </a>
              )}
            </div>
          )}

          {/* Customer Motive */}
          <div className="rounded-card bg-neutral-white p-5 shadow-card space-y-2">
            <h3 className="text-sm font-bold text-neutral-black">
              Motivo manifestado por el cliente
            </h3>
            <p className="text-sm text-neutral-dark bg-neutral-lightest p-3 rounded-lg border border-neutral-light">
              {solicitud.motivoGeneral}
            </p>
          </div>

          {/* Line items table */}
          <div className="rounded-card bg-neutral-white shadow-card overflow-hidden">
            <div className="p-4 border-b border-neutral-light font-bold text-sm text-neutral-black">
              Productos solicitados ({solicitud.totalItems} unidades)
            </div>
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-light bg-neutral-lightest text-xs font-bold text-neutral-dark uppercase">
                  <th className="py-2.5 px-4">Producto</th>
                  <th className="py-2.5 px-4">SKU</th>
                  <th className="py-2.5 px-4 text-center">Entonado</th>
                  <th className="py-2.5 px-4 text-center">Cant</th>
                  <th className="py-2.5 px-4 text-right">Precio Unit.</th>
                  <th className="py-2.5 px-4 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-light">
                {solicitud.lineas.map((l) => (
                  <tr key={l.idLineaPostventa}>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-neutral-black">
                        {l.nombreProducto}
                      </div>
                      <div className="text-xs text-neutral-medium">
                        {l.varianteCopia}
                        {l.colorSolicitado ? ` · Color: ${l.colorSolicitado}` : ''}
                      </div>
                      {l.motivoEspecifico && (
                        <div className="text-xs text-neutral-dark italic mt-0.5">
                          Nota: &quot;{l.motivoEspecifico}&quot;
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-neutral-medium">
                      {l.skuVendido ?? 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {l.esEntonado ? (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          A Medida
                        </span>
                      ) : (
                        <span className="text-xs text-neutral-medium">Estándar</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-neutral-black">
                      {l.cantidad}
                    </td>
                    <td className="py-3 px-4 text-right text-neutral-dark">
                      {formatearMoneda(l.precioUnitario)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-neutral-black">
                      {formatearMoneda(l.subTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bank Details */}
          {solicitud.datosBancarios && (
            <div className="rounded-card bg-neutral-white p-5 shadow-card space-y-2">
              <h3 className="text-sm font-bold text-neutral-black">
                Datos Bancarios del Cliente para Reembolso
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs bg-neutral-lightest p-3 rounded-lg border border-neutral-light">
                <div>
                  <span className="text-neutral-medium block">Entidad Bancaria</span>
                  <strong className="text-sm">{solicitud.datosBancarios.banco}</strong>
                </div>
                <div>
                  <span className="text-neutral-medium block">Tipo de Cuenta</span>
                  <strong className="text-sm capitalize">{solicitud.datosBancarios.tipoCuenta}</strong>
                </div>
                <div>
                  <span className="text-neutral-medium block">Número de Cuenta</span>
                  <strong className="text-sm font-mono">{solicitud.datosBancarios.numeroCuenta}</strong>
                </div>
                <div>
                  <span className="text-neutral-medium block">Titular y Documento</span>
                  <strong className="text-sm">
                    {solicitud.datosBancarios.titularNombre} ({solicitud.datosBancarios.titularDocumento})
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* Audit Trail */}
          <div className="rounded-card bg-neutral-white p-5 shadow-card space-y-3">
            <h3 className="text-sm font-bold text-neutral-black">
              Trazabilidad y Auditoría de Estados
            </h3>
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
                      Autor: {h.nombreAutor}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Modals */}
          <ModalResolverPostventa
            isOpen={modalResolverAbierto}
            onClose={() => setModalResolverAbierto(false)}
            codigoSolicitud={solicitud.codigo}
            onResuelto={(actualizado) => {
              setSolicitud(actualizado);
              cargar();
            }}
          />

          <ModalRegistrarReembolso
            isOpen={modalReembolsoAbierto}
            onClose={() => setModalReembolsoAbierto(false)}
            codigoSolicitud={solicitud.codigo}
            montoSugerido={solicitud.totalReembolso}
            onReembolsado={(actualizado) => {
              setSolicitud(actualizado);
              cargar();
            }}
          />
        </>
      )}
    </div>
  );
}
