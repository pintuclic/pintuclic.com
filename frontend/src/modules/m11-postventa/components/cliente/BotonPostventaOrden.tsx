'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RotateCcw, XCircle } from 'lucide-react';
import { Button } from '@/core/components';
import { ModalSolicitarCancelacion } from './ModalSolicitarCancelacion';
import {
  ModalSolicitarDevolucion,
  type LineaOrdenParaDevolucion,
} from './ModalSolicitarDevolucion';
import type { SolicitudPostventaDetalle } from '../../dtos/m11-postventa.dto';

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

  const esCancelable = [
    'orden_confirmada',
    'revision_disponibilidad',
    'en_preparacion',
  ].includes(estadoOrden);

  const esDevolvible = estadoOrden === 'entregado';

  const manejarExito = (solicitud: SolicitudPostventaDetalle) => {
    if (onSolicitudCreada) {
      onSolicitudCreada(solicitud);
    }
    router.push(`/perfil/devoluciones/${solicitud.codigo}`);
  };

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
