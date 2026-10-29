'use client';

import React, { useState } from 'react';
import { Alert, Button, Modal, Select, Textarea } from '@/core/components';
import { resolverSolicitud } from '../../services/postventa-api';
import {
  ETIQUETA_MOTIVO_RECHAZO,
} from '../../services/presentacion';
import {
  MOTIVOS_RECHAZO_POSTVENTA,
  type MotivoRechazoPostventa,
  type SolicitudPostventaDetalle,
} from '../../dtos/m11-postventa.dto';

export interface ModalResolverPostventaProps {
  isOpen: boolean;
  onClose: () => void;
  codigoSolicitud: string;
  onResuelto: (solicitud: SolicitudPostventaDetalle) => void;
}

const OPCIONES_ACCION = [
  { value: 'aprobar', label: 'Aprobar solicitud (Autorizar reembolso)' },
  { value: 'rechazar', label: 'Rechazar solicitud' },
];

const OPCIONES_MOTIVO_RECHAZO = MOTIVOS_RECHAZO_POSTVENTA.map((m) => ({
  value: m,
  label: ETIQUETA_MOTIVO_RECHAZO[m],
}));

export function ModalResolverPostventa({
  isOpen,
  onClose,
  codigoSolicitud,
  onResuelto,
}: ModalResolverPostventaProps) {
  const [accion, setAccion] = useState<'aprobar' | 'rechazar'>('aprobar');
  const [motivoRechazo, setMotivoRechazo] =
    useState<MotivoRechazoPostventa>('politica_no_cumplida');
  const [observaciones, setObservaciones] = useState('');

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const manejarEnvio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (accion === 'rechazar' && !observaciones.trim()) {
      setError('Es obligatorio ingresar las observaciones de rechazo.');
      return;
    }

    setCargando(true);
    setError(null);

    try {
      const res = await resolverSolicitud(codigoSolicitud, {
        accion,
        motivoRechazo: accion === 'rechazar' ? motivoRechazo : undefined,
        observaciones: observaciones.trim() || undefined,
      });

      onResuelto(res);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocurrió un error al resolver la solicitud.');
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Resolución de solicitud de postventa"
      subtitle={`Solicitud ${codigoSolicitud}`}
      size="md"
    >
      <form onSubmit={manejarEnvio} className="space-y-4">
        {error && (
          <Alert variant="error" title="No pudimos registrar la resolución">
            {error}
          </Alert>
        )}

        <Select
          label="Decisión administrativa"
          options={OPCIONES_ACCION}
          value={accion}
          onChange={(e) => setAccion(e.target.value as 'aprobar' | 'rechazar')}
        />

        {accion === 'rechazar' && (
          <div className="space-y-3 bg-rose-50 p-3 rounded-lg border border-rose-200">
            <Select
              label="Causal principal de rechazo"
              options={OPCIONES_MOTIVO_RECHAZO}
              value={motivoRechazo}
              onChange={(e) =>
                setMotivoRechazo(e.target.value as MotivoRechazoPostventa)
              }
            />
          </div>
        )}

        <Textarea
          id="observaciones-resolucion"
          label={
            accion === 'rechazar'
              ? 'Observaciones justificativas de rechazo (obligatorio)'
              : 'Observaciones internas o notas para el cliente (opcional)'
          }
          placeholder={
            accion === 'rechazar'
              ? 'Detalla la razón por la cual no procede la devolución o retracto...'
              : 'Notas adicionales sobre la aprobación...'
          }
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          rows={3}
          required={accion === 'rechazar'}
        />

        <div className="flex justify-end gap-3 pt-3">
          <Button type="button" variant="ghost" onClick={onClose} disabled={cargando}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant={accion === 'rechazar' ? 'outline' : 'primary-action'}
            disabled={cargando}
          >
            {cargando
              ? 'Guardando...'
              : accion === 'rechazar'
              ? 'Confirmar Rechazo'
              : 'Aprobar Solicitud'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
