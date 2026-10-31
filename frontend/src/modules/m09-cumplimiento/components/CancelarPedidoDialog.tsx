'use client';

import { useState } from 'react';
import { Button, Modal, Textarea } from '@/core/components';
import { MAX_NOTA_CANCELACION, type LineaVerificacion } from '../dtos/m09-cumplimiento.dto';
import { motivoDeCancelacion } from '../services/presentacion';

export interface CancelarPedidoDialogProps {
  abierto: boolean;
  onCerrar: () => void;
  codigo: string;
  lineas: readonly LineaVerificacion[];
  enviando: boolean;
  /** Pide la cancelación con la nota (si la hay). Devuelve true si quedó pedida: entonces el diálogo se cierra. */
  onConfirmar: (nota: string) => Promise<boolean>;
}

/**
 * R18 · Pedir la cancelación del pedido porque falta un producto. Muestra, antes de confirmar, el texto exacto que leerá el
 * cliente en el correo cuando se apruebe, incluida la nota del empleado (D19).
 */
export function CancelarPedidoDialog({ abierto, onCerrar, codigo, lineas, enviando, onConfirmar }: CancelarPedidoDialogProps) {
  const [nota, setNota] = useState('');
  const motivo = motivoDeCancelacion(lineas, nota);

  const confirmar = async (): Promise<void> => {
    if (await onConfirmar(nota)) {
      setNota('');
      onCerrar();
    }
  };

  return (
    <Modal isOpen={abierto} onClose={onCerrar} title="Cancelar pedido" subtitle={codigo} size="md" closeOnOutsideClick={!enviando}>
      <div className="space-y-4">
        <p className="text-sm text-neutral-dark">
          Se enviará una solicitud de cancelación a postventa. El pedido no se cancela hasta que se apruebe; en ese momento el
          cliente recibe un correo con el motivo.
        </p>

        <div>
          <p className="mb-1.5 font-title text-sm font-medium text-neutral-dark">Esto es lo que leerá el cliente</p>
          <p className="whitespace-pre-line rounded-input bg-neutral-light/60 p-3 text-sm text-neutral-black" data-testid="motivo-cancelacion">
            {motivo}
          </p>
        </div>

        <Textarea
          id="nota-cancelacion"
          label="Nota para el cliente (opcional)"
          helperText={`${nota.length} de ${MAX_NOTA_CANCELACION} caracteres. Se incluye en el correo tal como la escriba.`}
          maxLength={MAX_NOTA_CANCELACION}
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          disabled={enviando}
        />

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onCerrar} disabled={enviando}>
            Volver
          </Button>
          <Button variant="danger" isLoading={enviando} onClick={() => void confirmar()}>
            Pedir la cancelación
          </Button>
        </div>
      </div>
    </Modal>
  );
}
