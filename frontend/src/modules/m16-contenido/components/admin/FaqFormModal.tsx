'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Button,
  Input,
  Modal,
  Select,
  Textarea,
  type SelectOption,
} from '@/core/components';
import {
  faqFormSchema,
  type FaqFormValues,
} from '../../dtos/m16-contenido.dto';
import type { FaqAdminEntity } from '../../interfaces/contenido.interface';
import { BarraFormatoTexto } from './BarraFormatoTexto';

export interface FaqFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  faqEditar: FaqAdminEntity | null;
  ordenSugerido: number;
  onSubmitForm: (valores: FaqFormValues) => Promise<void>;
  errorServidor: string | null;
}

const OPCIONES_ESTADO_FAQ: ReadonlyArray<SelectOption> = [
  { value: 'activo', label: 'Activo (visible en Centro de Ayuda)' },
  { value: 'inactivo', label: 'Inactivo (oculto al público)' },
];

export const FaqFormModal: React.FC<FaqFormModalProps> = ({
  isOpen,
  onClose,
  faqEditar,
  ordenSugerido,
  onSubmitForm,
  errorServidor,
}) => {
  const esEdicion = faqEditar !== null;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FaqFormValues>({
    resolver: zodResolver(faqFormSchema),
    defaultValues: {
      pregunta: '',
      respuestaMarkdown: '',
      orden: ordenSugerido,
      estado: 'activo',
    },
  });

  useEffect(() => {
    if (!isOpen) return;
    if (faqEditar) {
      reset({
        pregunta: faqEditar.pregunta,
        respuestaMarkdown: faqEditar.respuestaMarkdown,
        orden: faqEditar.orden,
        estado: faqEditar.estado,
      });
    } else {
      reset({
        pregunta: '',
        respuestaMarkdown: '',
        orden: ordenSugerido,
        estado: 'activo',
      });
    }
  }, [isOpen, faqEditar, ordenSugerido, reset]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={esEdicion ? 'Editar Pregunta Frecuente' : 'Nueva Pregunta Frecuente'}
      subtitle="Se mostrará en el Centro de Ayuda público y estará disponible para Atención al Cliente"
    >
      <form
        onSubmit={handleSubmit(onSubmitForm)}
        noValidate
        className="space-y-4"
      >
        {errorServidor && (
          <Alert variant="error" title="No se pudo guardar la pregunta frecuente">
            {errorServidor}
          </Alert>
        )}

        <Input
          id="faq-pregunta"
          label="Pregunta frecuente"
          placeholder="Ej. ¿Cómo solicito una cuenta empresarial (B2B)?"
          required
          error={errors.pregunta?.message}
          {...register('pregunta')}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            id="faq-orden"
            type="number"
            min={0}
            max={9999}
            label="Orden de aparición"
            helperText="Menor número aparece primero (0, 1, 2...)"
            required
            error={errors.orden?.message}
            {...register('orden', { valueAsNumber: true })}
          />

          {!esEdicion && (
            <Select
              id="faq-estado-inicial"
              label="Estado inicial"
              options={OPCIONES_ESTADO_FAQ}
              error={errors.estado?.message}
              {...register('estado')}
            />
          )}
        </div>

        <BarraFormatoTexto
          textareaId="faq-respuesta-markdown"
          valor={watch('respuestaMarkdown') ?? ''}
          onChangeValor={(nuevo) =>
            setValue('respuestaMarkdown', nuevo, { shouldValidate: true, shouldDirty: true })
          }
        >
          <Textarea
            id="faq-respuesta-markdown"
            label="Respuesta de la pregunta"
            rows={6}
            required
            placeholder="Escribe una respuesta clara y usa los botones superiores para Negrita o Listas."
            helperText="Selecciona texto y pulsa Negrita o Lista arriba, o usa 'Ver cómo queda'."
            error={errors.respuestaMarkdown?.message}
            {...register('respuestaMarkdown')}
          />
        </BarraFormatoTexto>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-light">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary-action"
            isLoading={isSubmitting}
          >
            {esEdicion ? 'Guardar cambios' : 'Crear pregunta'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
