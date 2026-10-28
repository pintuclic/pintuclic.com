'use client';

import React, { useState } from 'react';
import { Alert, Button, Input, Modal, Textarea, Select } from '@/core/components';
import { solicitarCancelacion } from '../../services/postventa-api';
import type { SolicitudPostventaDetalle } from '../../dtos/m11-postventa.dto';

export interface ModalSolicitarCancelacionProps {
  isOpen: boolean;
  onClose: () => void;
  codigoOrden: string;
  onExito: (solicitud: SolicitudPostventaDetalle) => void;
}

const OPCIONES_TIPO_CUENTA = [
  { value: 'ahorros', label: 'Cuenta de Ahorros' },
  { value: 'corriente', label: 'Cuenta Corriente' },
];

export function ModalSolicitarCancelacion({
  isOpen,
  onClose,
  codigoOrden,
  onExito,
}: ModalSolicitarCancelacionProps) {
  const [motivo, setMotivo] = useState('');
  const [incluirDatosBancarios, setIncluirDatosBancarios] = useState(false);
  const [banco, setBanco] = useState('');
  const [tipoCuenta, setTipoCuenta] = useState<'ahorros' | 'corriente'>('ahorros');
  const [numeroCuenta, setNumeroCuenta] = useState('');
  const [titularNombre, setTitularNombre] = useState('');
  const [titularDocumento, setTitularDocumento] = useState('');

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const manejarEnvio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (motivo.trim().length < 10) {
      setError('Por favor detalle el motivo con al menos 10 caracteres.');
      return;
    }

    setCargando(true);
    setError(null);

    try {
      const datosReembolso = incluirDatosBancarios
        ? {
            banco: banco.trim(),
            tipoCuenta,
            numeroCuenta: numeroCuenta.trim(),
            titularNombre: titularNombre.trim(),
            titularDocumento: titularDocumento.trim(),
          }
        : undefined;

      const resultado = await solicitarCancelacion({
        codigoOrden,
        motivo: motivo.trim(),
        datosReembolso,
      });

      onExito(resultado);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocurrió un error al procesar la cancelación. Intente de nuevo.');
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Solicitar cancelación de pedido"
      subtitle={`Pedido #${codigoOrden}`}
      size="md"
    >
      <form onSubmit={manejarEnvio} className="space-y-4">
        {error && (
          <Alert variant="error" title="No pudimos registrar la cancelación">
            {error}
          </Alert>
        )}

        <p className="text-sm text-neutral-dark">
          Puedes cancelar tu pedido de forma inmediata mientras se encuentre en
          preparación antes de su despacho. Se iniciará el trámite de reembolso por el
          total pagado.
        </p>

        <Textarea
          id="motivo-cancelacion"
          label="Motivo de la cancelación"
          placeholder="Cuéntanos la razón por la que deseas cancelar este pedido (mínimo 10 caracteres)..."
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={3}
          required
        />

        <div className="pt-2 border-t border-neutral-light">
          <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-neutral-dark">
            <input
              type="checkbox"
              checked={incluirDatosBancarios}
              onChange={(e) => setIncluirDatosBancarios(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-medium text-action focus:ring-action"
            />
            Registrar cuenta bancaria para consignación del reembolso
          </label>
        </div>

        {incluirDatosBancarios && (
          <div className="space-y-3 bg-neutral-lightest p-3 rounded-lg border border-neutral-light">
            <h4 className="text-xs font-bold text-neutral-black uppercase tracking-wider">
              Datos de la cuenta bancaria
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Banco"
                placeholder="Ej. Bancolombia, Davivienda"
                value={banco}
                onChange={(e) => setBanco(e.target.value)}
                required={incluirDatosBancarios}
              />
              <Select
                label="Tipo de cuenta"
                options={OPCIONES_TIPO_CUENTA}
                value={tipoCuenta}
                onChange={(e) =>
                  setTipoCuenta(e.target.value as 'ahorros' | 'corriente')
                }
              />
            </div>
            <Input
              label="Número de cuenta"
              placeholder="Número sin guiones ni espacios"
              value={numeroCuenta}
              onChange={(e) => setNumeroCuenta(e.target.value)}
              required={incluirDatosBancarios}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Nombre del titular"
                placeholder="Nombre completo"
                value={titularNombre}
                onChange={(e) => setTitularNombre(e.target.value)}
                required={incluirDatosBancarios}
              />
              <Input
                label="Documento del titular"
                placeholder="Cédula o NIT"
                value={titularDocumento}
                onChange={(e) => setTitularDocumento(e.target.value)}
                required={incluirDatosBancarios}
              />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-3">
          <Button type="button" variant="ghost" onClick={onClose} disabled={cargando}>
            Atrás
          </Button>
          <Button type="submit" variant="primary-action" disabled={cargando}>
            {cargando ? 'Procesando...' : 'Confirmar Cancelación'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
