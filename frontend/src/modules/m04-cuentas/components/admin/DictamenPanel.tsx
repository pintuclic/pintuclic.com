'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, X } from 'lucide-react';
import { Alert, Button, Textarea } from '@/core/components';
import {
  dictamenRegistroEmpresaFormSchema,
  dictamenSolicitudEmpresaFormSchema,
  type DictamenSolicitudEmpresaFormData,
} from '../../dtos/m04-cuentas.dto';

export interface DictamenPanelProps {
  /** RN-CUE-17: true solo para el rechazo de un registro de empresa. */
  motivoObligatorio: boolean;
  /** Lanza un Error con el mensaje para mostrar si el servidor rechaza el dictamen. */
  onDictaminar: (dictamen: DictamenSolicitudEmpresaFormData) => Promise<void>;
}

/**
 * HU-CUE-09 · Aprobar o rechazar. El servidor aplica la decisión de forma
 * atómica: si otro administrador decidió antes, responde un conflicto que aquí
 * se muestra tal cual.
 */
export function DictamenPanel({ motivoObligatorio, onDictaminar }: DictamenPanelProps) {
  const [rechazando, setRechazando] = useState(false);
  const [aprobando, setAprobando] = useState(false);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DictamenSolicitudEmpresaFormData>({
    resolver: zodResolver(motivoObligatorio ? dictamenRegistroEmpresaFormSchema : dictamenSolicitudEmpresaFormSchema),
    defaultValues: { decision: 'rechazar', motivoRechazo: '' },
  });

  const ejecutar = async (dictamen: DictamenSolicitudEmpresaFormData) => {
    setErrorServidor(null);
    try {
      await onDictaminar(dictamen);
    } catch (error) {
      setErrorServidor(error instanceof Error ? error.message : 'No pudimos registrar la decisión.');
    }
  };

  const aprobar = async () => {
    setAprobando(true);
    await ejecutar({ decision: 'aprobar' });
    setAprobando(false);
  };

  const rechazar = handleSubmit((datos) => ejecutar({ ...datos, decision: 'rechazar' }));

  return (
    <div className="flex flex-col gap-4 border-t border-neutral-light/60 pt-5">
      {errorServidor && <Alert variant="error">{errorServidor}</Alert>}

      {rechazando ? (
        <form onSubmit={rechazar} noValidate className="flex flex-col gap-4">
          <Textarea
            id="dictamen-motivo"
            label={motivoObligatorio ? 'Motivo del rechazo' : 'Motivo del rechazo (opcional)'}
            rows={4}
            maxLength={500}
            helperText={
              motivoObligatorio
                ? 'Obligatorio: mínimo 10 caracteres. Se comunica al solicitante.'
                : 'Si lo escribes, el solicitante lo verá en su cuenta.'
            }
            error={errors.motivoRechazo?.message}
            {...register('motivoRechazo')}
          />
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setRechazando(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="danger" isLoading={isSubmitting}>
              Confirmar rechazo
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            leftIcon={<X className="h-4 w-4" aria-hidden="true" />}
            onClick={() => setRechazando(true)}
            disabled={aprobando}
          >
            Rechazar
          </Button>
          <Button
            type="button"
            variant="primary-conversion"
            leftIcon={<Check className="h-4 w-4" aria-hidden="true" />}
            isLoading={aprobando}
            onClick={aprobar}
          >
            Aprobar
          </Button>
        </div>
      )}
    </div>
  );
}
