'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Input, Modal, Select, Textarea } from '@/core/components';
import { formAjusteSchema, type FormAjuste } from '../dtos/formularios.dto';
import { motivoManualSchema, type ItemInventario } from '../dtos/m13-inventario.dto';
import { inventarioApi } from '../services/inventario-api';
import { ETIQUETAS_MOTIVO, formatearNumero } from '../services/etiquetas';
import { aCuerpoAjuste } from '../services/formularios';
import { leerErrorInventario } from '../services/mensaje-error';

export interface AjustarModalProps {
  item: ItemInventario;
  onClose: () => void;
  /** Recibe el texto con que la pantalla confirma lo que pasó. */
  onGuardado: (texto: string) => void;
}

interface DetallesConflicto {
  existenciaActual: number;
}

function esConflicto(detalles: unknown): detalles is DetallesConflicto {
  return (
    typeof detalles === 'object' &&
    detalles !== null &&
    typeof (detalles as { existenciaActual?: unknown }).existenciaActual === 'number'
  );
}

/**
 * Ajuste manual de la existencia de una variante (R2–R4). La existencia que se veía al abrir el
 * formulario viaja como `existenciaEsperada`: si otra persona la cambió, la API no escribe nada y
 * aquí se muestra el valor vigente para que se decida con la información al día.
 */
export const AjustarModal: React.FC<AjustarModalProps> = ({ item, onClose, onGuardado }) => {
  const [vista, setVista] = useState(item.existenciaReferencial);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormAjuste>({
    resolver: zodResolver(formAjusteSchema),
    defaultValues: { existencia: String(item.existenciaReferencial), motivo: 'correccion', nota: '' },
  });

  const guardar = handleSubmit(async (valores) => {
    setError(null);
    setAviso(null);
    const cuerpo = aCuerpoAjuste(valores, vista);
    if (!cuerpo.ok) {
      setError(cuerpo.mensaje);
      return;
    }
    try {
      const r = await inventarioApi.ajustar(item.idVariante, cuerpo.valor);
      onGuardado(
        r.ajuste === null
          ? `La existencia de ${item.producto} · ${item.medida} ya era ${formatearNumero(r.item.existenciaReferencial)}: no se registró ningún cambio.`
          : `Existencia de ${item.producto} · ${item.medida}: de ${formatearNumero(r.ajuste.existenciaAnterior)} a ${formatearNumero(r.ajuste.existenciaNueva)}.`,
      );
      onClose();
    } catch (err: unknown) {
      const e = leerErrorInventario(err, 'No se pudo guardar el ajuste.');
      if (e.code === 'CONFLICTO_EXISTENCIA' && esConflicto(e.details)) {
        // Otra persona se adelantó: se muestra el valor vigente y se deja decidir de nuevo.
        setVista(e.details.existenciaActual);
        setValue('existencia', String(e.details.existenciaActual));
        setAviso(
          `Otra persona cambió la existencia mientras la editaba: ahora es ${formatearNumero(e.details.existenciaActual)}. Revise el valor y vuelva a guardar.`,
        );
        return;
      }
      setError(e.message);
    }
  });

  return (
    <Modal
      isOpen
      closeOnOutsideClick={false}
      onClose={onClose}
      title="Ajustar existencia"
      subtitle={`${item.producto} · ${item.medida} (${item.sku})`}
      size="md"
    >
      <form onSubmit={(e) => void guardar(e)} noValidate className="space-y-4 py-2">
        {aviso !== null && <Alert variant="warning">{aviso}</Alert>}
        {error !== null && <Alert variant="error">{error}</Alert>}
        <p className="font-sans text-sm text-neutral-dark">
          Existencia actual: <strong className="text-neutral-black">{formatearNumero(vista)}</strong>. Es solo una nota
          para el equipo: no bloquea las ventas.
        </p>
        <Input
          label="Existencia nueva"
          inputMode="numeric"
          {...register('existencia')}
          error={errors.existencia?.message}
        />
        <Select
          label="Motivo"
          {...register('motivo')}
          options={motivoManualSchema.options.map((m) => ({ value: m, label: ETIQUETAS_MOTIVO[m] }))}
        />
        <Textarea
          label="Nota (opcional)"
          rows={3}
          {...register('nota')}
          error={errors.nota?.message}
          helperText="Por ejemplo, el número de remisión o quién hizo el conteo."
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary-action" isLoading={isSubmitting}>
            Guardar existencia
          </Button>
        </div>
      </form>
    </Modal>
  );
};
