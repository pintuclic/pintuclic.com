'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Textarea } from '@/core/components';
import type { NotaOrden } from '../../dtos/m08-ordenes.dto';
import { notaFormSchema, type NotaForm } from '../../dtos/formularios.dto';
import { formatearFechaHora } from '../../services/presentacion';

export interface NotasPanelProps {
  notas: ReadonlyArray<NotaOrden>;
  operando: boolean;
  onAgregar: (texto: string) => Promise<boolean>;
}

/** HU-ORD-10 · Notas internas: se ven solo aquí, con su autor y momento, y no se editan ni se borran. */
export function NotasPanel({ notas, operando, onAgregar }: NotasPanelProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NotaForm>({ resolver: zodResolver(notaFormSchema), defaultValues: { texto: '' } });

  return (
    <div className="space-y-4">
      {notas.length === 0 ? (
        <p className="text-sm text-neutral-medium">Aún no hay notas.</p>
      ) : (
        <ul className="space-y-3">
          {notas.map((nota) => (
            <li key={nota.idNota} className="rounded-card bg-neutral-lightest p-3">
              <p className="whitespace-pre-wrap font-sans text-sm text-neutral-dark">{nota.texto}</p>
              <p className="mt-1 text-xs text-neutral-medium">
                {nota.autor} · {formatearFechaHora(nota.fecha)}
              </p>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={handleSubmit(async ({ texto }) => {
          if (await onAgregar(texto)) reset({ texto: '' });
        })}
        className="space-y-2"
      >
        <Textarea
          label="Nueva nota"
          rows={3}
          helperText="Una nota registrada no se puede editar ni borrar: añada otra si hace falta aclarar."
          error={errors.texto?.message}
          {...register('texto')}
        />
        <Button type="submit" variant="outline" isLoading={operando}>
          Añadir nota
        </Button>
      </form>
    </div>
  );
}
