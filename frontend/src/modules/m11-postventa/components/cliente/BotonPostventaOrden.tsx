'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Eye, RotateCcw, XCircle } from 'lucide-react';
import { Button, ButtonLink } from '@/core/components';
import { ModalSolicitarCancelacion } from './ModalSolicitarCancelacion';
import {
  ModalSolicitarDevolucion,
  type LineaOrdenParaDevolucion,
} from './ModalSolicitarDevolucion';
import { EstadoPostventaBadge } from '../EstadoPostventaBadge';
import { listarMisSolicitudes } from '../../services/postventa-api';
import type {
  SolicitudPostventaDetalle,
  SolicitudPostventaResumen,
} from '../../dtos/m11-postventa.dto';

export interface BotonPostventaOrdenProps {
  codigoOrden: string;
  estadoOrden: string;
  lineas: LineaOrdenParaDevolucion[];
  onSolicitudCreada?: (solicitud: SolicitudPostventaDetalle) => void;
}

export function BotonPostventaOrden({
  codigoOrden,
  estadoOrden,
  lineas,
  onSolicitudCreada,
}: BotonPostventaOrdenProps) {
  const router = useRouter();
  const [modalCancelacionAbierto, setModalCancelacionAbierto] = useState(false);
  const [modalDevolucionAbierto, setModalDevolucionAbierto] = useState(false);
  const [solicitudExistente, setSolicitudExistente] = useState<
    SolicitudPostventaResumen | SolicitudPostventaDetalle | null
  >(null);

  useEffect(() => {
    let activo = true;
    listarMisSolicitudes({ limite: 50 })
      .then(({ items }) => {
        if (!activo) return;
        const encontrada = items.find((s) => s.codigoOrden === codigoOrden);
        if (encontrada) {
          setSolicitudExistente(encontrada);
        }
      })
      .catch(() => {
        // Silencioso en caso de error o sesion no iniciada
      });

    return () => {
      activo = false;
    };
  }, [codigoOrden]);

  const estado = (estadoOrden ?? '').trim().toLowerCase();
  const esCancelable = [
    'orden_confirmada',
    'revision_disponibilidad',
    'en_preparacion',
  ].includes(estado);

  const esDevolvible = estado === 'entregado';

  const manejarExito = (solicitud: SolicitudPostventaDetalle) => {
    setSolicitudExistente(solicitud);
    if (onSolicitudCreada) {
      onSolicitudCreada(solicitud);
    }
    router.push(`/perfil/devoluciones/${solicitud.codigo}`);
  };

  // Si ya hay una solicitud en curso o finalizada para esta orden, mostrar el estado en vez de permitir duplicarla
  if (
    solicitudExistente &&
    ['solicitada', 'en_revision', 'aprobada', 'reembolsada'].includes(
      solicitudExistente.estado
    )
  ) {
    const esCancelacion = solicitudExistente.tipo === 'cancelacion';
    return (
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-card border border-neutral-light bg-neutral-lightest p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Clock className="h-4 w-4 text-warning" />
          <span className="font-semibold text-sm text-neutral-black">
            {esCancelacion ? 'Cancelación solicitada' : 'Devolución solicitada'}
          </span>
          <span className="font-mono text-xs text-neutral-medium">
            ({solicitudExistente.codigo})
          </span>
          <EstadoPostventaBadge estado={solicitudExistente.estado} />
        </div>
        <ButtonLink
          href={`/perfil/devoluciones/${solicitudExistente.codigo}`}
          variant="outline"
          size="sm"
          leftIcon={<Eye className="h-3.5 w-3.5" />}
        >
          Ver solicitud
        </ButtonLink>
      </div>
    );
  }

  if (!esCancelable && !esDevolvible) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-3 pt-2">
      {esCancelable && (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setModalCancelacionAbierto(true)}
            leftIcon={<XCircle className="h-4 w-4 text-rose-600" />}
          >
            Solicitar cancelación
          </Button>

          <ModalSolicitarCancelacion
            isOpen={modalCancelacionAbierto}
            onClose={() => setModalCancelacionAbierto(false)}
            codigoOrden={codigoOrden}
            onExito={manejarExito}
          />
        </>
      )}

      {esDevolvible && (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setModalDevolucionAbierto(true)}
            leftIcon={<RotateCcw className="h-4 w-4 text-primary-600" />}
          >
            Solicitar devolución o garantía
          </Button>

          <ModalSolicitarDevolucion
            isOpen={modalDevolucionAbierto}
            onClose={() => setModalDevolucionAbierto(false)}
            codigoOrden={codigoOrden}
            lineas={lineas}
            onExito={manejarExito}
          />
        </>
      )}
    </div>
  );
}
