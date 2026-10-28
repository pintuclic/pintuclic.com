'use client';

import React, { useState } from 'react';
import { Alert, Button, Input, Modal, Select, Textarea } from '@/core/components';
import { registrarReembolso } from '../../services/postventa-api';
import {
  ETIQUETA_METODO_REEMBOLSO,
} from '../../services/presentacion';
import {
  METODOS_REEMBOLSO,
  type MetodoReembolso,
  type SolicitudPostventaDetalle,
} from '../../dtos/m11-postventa.dto';

export interface ModalRegistrarReembolsoProps {
  isOpen: boolean;
  onClose: () => void;
  codigoSolicitud: string;
  montoSugerido: number;
  onReembolsado: (solicitud: SolicitudPostventaDetalle) => void;
}

const OPCIONES_METODOS = METODOS_REEMBOLSO.map((m) => ({
  value: m,
  label: ETIQUETA_METODO_REEMBOLSO[m],
}));

export function ModalRegistrarReembolso({
  isOpen,
  onClose,
  codigoSolicitud,
  montoSugerido,
  onReembolsado,
}: ModalRegistrarReembolsoProps) {
  const [metodo, setMetodo] = useState<MetodoReembolso>('transferencia_bancaria');
  const [monto, setMonto] = useState<number>(montoSugerido);
  const [referencia, setReferencia] = useState('');
  const [comprobanteUrl, setComprobanteUrl] = useState('');
  const [notas, setNotas] = useState('');

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const manejarEnvio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!referencia.trim()) {
      setError('Por favor indica la referencia o identificador del pago.');
      return;
    }

    setCargando(true);
    setError(null);

    try {
      const res = await registrarReembolso(codigoSolicitud, {
        metodo,
        montoReembolsado: Number(monto),
        referenciaTransaccion: referencia.trim(),
        comprobanteUrl: comprobanteUrl.trim() || undefined,
        notas: notas.trim() || undefined,
      });

      onReembolsado(res);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocurrió un error al registrar el reembolso.');
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar liquidación de reembolso"
      subtitle={`Solicitud ${codigoSolicitud}`}
      size="md"
    >
      <form onSubmit={manejarEnvio} className="space-y-4">
        {error && (
          <Alert variant="error" title="No pudimos registrar el reembolso">
            {error}
          </Alert>
        )}

        <Select
          label="Método de desembolso"
          options={OPCIONES_METODOS}
          value={metodo}
          onChange={(e) => setMetodo(e.target.value as MetodoReembolso)}
        />

        <Input
          label="Monto reembolsado ($ COP)"
          type="number"
          min={0}
          value={monto}
          onChange={(e) => setMonto(parseFloat(e.target.value) || 0)}
          required
        />

        <Input
          label="Referencia o número de transacción"
          placeholder="Ej. TRANS-20261028-0912 o ID de pasarela"
          value={referencia}
          onChange={(e) => setReferencia(e.target.value)}
          required
        />

        <Input
          label="Enlace a comprobante (opcional)"
          placeholder="https://..."
          type="url"
          value={comprobanteUrl}
          onChange={(e) => setComprobanteUrl(e.target.value)}
        />

        <Textarea
          id="notas-reembolso"
          label="Notas adicionales (opcional)"
          placeholder="Comentarios contables o del desembolso..."
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          rows={2}
        />

        <div className="flex justify-end gap-3 pt-3">
          <Button type="button" variant="ghost" onClick={onClose} disabled={cargando}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary-action" disabled={cargando}>
            {cargando ? 'Guardando...' : 'Registrar Reembolso'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
