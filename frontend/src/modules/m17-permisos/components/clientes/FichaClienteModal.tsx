'use client';

import React from 'react';
import { Calendar, FileText, Lock, ShoppingBag, User } from 'lucide-react';
import { Badge, Button, Modal } from '@/core/components';
import { PagosClienteResumen } from '@/modules/m07-checkout/components/PagosClienteResumen';
import type { FichaClienteRespuesta } from '../../interfaces/clientes-admin.interface';
import { puedeVerRuta } from '../../services/acceso-panel';
import { useAccesoStore } from '../../store/accesoStore';

export interface FichaClienteModalProps {
  cliente: FichaClienteRespuesta | null;
  isOpen: boolean;
  onClose: () => void;
}

export const FichaClienteModal: React.FC<FichaClienteModalProps> = ({
  cliente,
  isOpen,
  onClose,
}) => {
  const acceso = useAccesoStore((s) => s.acceso);
  if (!cliente) return null;

  // Los pagos piden `ventas.ver` (M07 · R16): sin ese permiso la sección no se muestra ni se consulta.
  const verPagos = acceso !== null && puedeVerRuta('/admin/pagos', acceso);

  const ordenesRecientes = cliente.ordenesRecientes ?? [];
  const cotizacionesRecientes = cliente.cotizacionesRecientes ?? [];

  const formatearDinero = (monto: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(monto);
  };

  const formatearFecha = (fechaStr: string) => {
    return new Date(fechaStr).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5">
          <User className="w-5 h-5 text-action" />
          <span>Ficha Administrativa de Cliente</span>
        </div>
      }
      subtitle={`Consulta de perfil y actividad comercial para ID #${cliente.idUsuario}`}
      size="lg"
      showRainbowStrip
    >
      <div className="space-y-6 py-2">
        {/* ================================================================== */}
        {/* 1. DATOS DE IDENTIDAD DEL CLIENTE                                  */}
        {/* ================================================================== */}
        <div className="p-4 bg-neutral-lightest border border-neutral-light/70 rounded-card grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span className="font-title font-medium text-xs text-neutral-medium uppercase tracking-wider block">
              Nombre o Razón Social
            </span>
            <p className="font-title font-bold text-sm text-neutral-black mt-0.5">
              {cliente.nombre}
            </p>
          </div>

          <div>
            <span className="font-title font-medium text-xs text-neutral-medium uppercase tracking-wider block">
              Correo Electrónico
            </span>
            <p className="font-sans text-xs text-neutral-dark mt-0.5">{cliente.correo}</p>
          </div>

          <div>
            <span className="font-title font-medium text-xs text-neutral-medium uppercase tracking-wider block">
              Teléfono de Contacto
            </span>
            <p className="font-sans text-xs text-neutral-dark mt-0.5">
              {cliente.telefono || 'Sin registrar'}
            </p>
          </div>

          <div>
            <span className="font-title font-medium text-xs text-neutral-medium uppercase tracking-wider block">
              Tipo de Cuenta & Estado
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 bg-subaction text-action text-xs font-semibold rounded uppercase">
                {cliente.tipo}
              </span>
              <Badge variant={cliente.estado === 'activo' ? 'success' : 'neutral'}>
                {cliente.estado}
              </Badge>
            </div>
          </div>
        </div>

        {/* Nota de integridad RN-ADM-07 */}
        <div className="p-3 bg-neutral-white border border-neutral-light rounded-btn flex items-center gap-2 text-xs text-neutral-medium">
          <Lock className="w-4 h-4 text-neutral-medium shrink-0" />
          <span>
            Los datos personales del cliente son soberanía exclusiva del titular (RN-ADM-07) y no
            pueden ser modificados directamente por la administración.
          </span>
        </div>

        {/* ================================================================== */}
        {/* PAGOS DEL CLIENTE CON FILTRO DE PERIODO (M07 · R18)                */}
        {/* ================================================================== */}
        {verPagos && <PagosClienteResumen idCliente={cliente.idUsuario} />}

        {/* ================================================================== */}
        {/* 2. ÓRDENES RECIENTES                                               */}
        {/* ================================================================== */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-corporate font-title font-semibold text-sm">
            <ShoppingBag className="w-4 h-4 text-conversion" />
            <span>Órdenes Recientes ({ordenesRecientes.length})</span>
          </div>

          {ordenesRecientes.length === 0 ? (
            <p className="p-4 bg-neutral-lightest border border-neutral-light/50 rounded-btn text-xs text-neutral-medium text-center">
              El cliente aún no ha generado órdenes de compra.
            </p>
          ) : (
            <div className="border border-neutral-light rounded-btn overflow-hidden">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-neutral-lightest text-neutral-medium uppercase font-title font-semibold text-[10px] border-b border-neutral-light">
                  <tr>
                    <th className="px-4 py-2.5">Código</th>
                    <th className="px-4 py-2.5">Fecha</th>
                    <th className="px-4 py-2.5">Estado</th>
                    <th className="px-4 py-2.5 text-right">Monto Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-light/50 text-neutral-dark">
                  {ordenesRecientes.map((ord) => (
                    <tr key={ord.idOrden} className="hover:bg-neutral-lightest/40">
                      <td className="px-4 py-2.5 font-mono font-semibold text-action">
                        {ord.codigoVisible}
                      </td>
                      <td className="px-4 py-2.5 text-neutral-medium">
                        {formatearFecha(ord.fecha)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-conversion/10 text-conversion-hover uppercase">
                          {ord.estado}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-title font-bold text-neutral-black">
                        {formatearDinero(ord.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ================================================================== */}
        {/* 3. COTIZACIONES RECIENTES                                          */}
        {/* ================================================================== */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-corporate font-title font-semibold text-sm">
            <FileText className="w-4 h-4 text-action" />
            <span>Cotizaciones Recientes ({cotizacionesRecientes.length})</span>
          </div>

          {cotizacionesRecientes.length === 0 ? (
            <p className="p-4 bg-neutral-lightest border border-neutral-light/50 rounded-btn text-xs text-neutral-medium text-center">
              No registra cotizaciones solicitadas.
            </p>
          ) : (
            <div className="border border-neutral-light rounded-btn overflow-hidden">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-neutral-lightest text-neutral-medium uppercase font-title font-semibold text-[10px] border-b border-neutral-light">
                  <tr>
                    <th className="px-4 py-2.5">ID</th>
                    <th className="px-4 py-2.5">Fecha</th>
                    <th className="px-4 py-2.5">Estado</th>
                    <th className="px-4 py-2.5 text-right">Total Estimado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-light/50 text-neutral-dark">
                  {cotizacionesRecientes.map((cot) => (
                    <tr key={cot.idCotizacion} className="hover:bg-neutral-lightest/40">
                      <td className="px-4 py-2.5 font-mono font-semibold text-corporate">
                        COT-#{cot.idCotizacion}
                      </td>
                      <td className="px-4 py-2.5 text-neutral-medium">
                        {formatearFecha(cot.fecha)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-subaction text-action uppercase">
                          {cot.estado}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-title font-bold text-neutral-black">
                        {formatearDinero(cot.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-neutral-light/50">
          <span className="text-xs text-neutral-medium flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> Registrado el {formatearFecha(cliente.fechaRegistro)}
          </span>
          <Button variant="primary-action" size="md" onClick={onClose}>
            Cerrar Ficha
          </Button>
        </div>
      </div>
    </Modal>
  );
};
