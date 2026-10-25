'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { WandSparkles } from 'lucide-react';
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
  normalizarSlugPagina,
  paginaFormSchema,
  type PaginaFormValues,
} from '../../dtos/m16-contenido.dto';
import type { PaginaAdminEntity } from '../../interfaces/contenido.interface';

export interface PaginaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  paginaEditar: PaginaAdminEntity | null;
  onSubmitForm: (valores: PaginaFormValues) => Promise<void>;
  errorServidor: string | null;
}

const OPCIONES_ESTADO_PAGINA: ReadonlyArray<SelectOption> = [
  { value: 'borrador', label: 'Borrador (solo visible en admin)' },
  { value: 'publicado', label: 'Publicado (visible en tienda)' },
  { value: 'archivado', label: 'Archivado (oculto en tienda)' },
];

export const PaginaFormModal: React.FC<PaginaFormModalProps> = ({
  isOpen,
  onClose,
  paginaEditar,
  onSubmitForm,
  errorServidor,
}) => {
  const esEdicion = paginaEditar !== null;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PaginaFormValues>({
    resolver: zodResolver(paginaFormSchema),
    defaultValues: {
      titulo: '',
      slug: '',
      resumen: '',
      cuerpoMarkdown: '',
      estado: 'borrador',
    },
  });

  useEffect(() => {
    if (!isOpen) return;
    if (paginaEditar) {
      reset({
        titulo: paginaEditar.titulo,
        slug: paginaEditar.slug,
        resumen: paginaEditar.resumen ?? '',
        cuerpoMarkdown: paginaEditar.cuerpoMarkdown,
        estado: paginaEditar.estado,
      });
    } else {
      reset({
        titulo: '',
        slug: '',
        resumen: '',
        cuerpoMarkdown: '',
        estado: 'borrador',
      });
    }
  }, [isOpen, paginaEditar, reset]);

  const tituloActual = watch('titulo');

  const autogenerarSlug = () => {
    const sugerido = normalizarSlugPagina(tituloActual || '');
    if (sugerido) {
      setValue('slug', sugerido, { shouldValidate: true });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={esEdicion ? 'Editar Página Institucional' : 'Nueva Página Institucional'}
      subtitle={
        esEdicion
          ? `Modificando /paginas/${paginaEditar.slug}`
          : 'Crea una página informativa o política para la vitrina pública'
      }
    >
      <form
        onSubmit={handleSubmit(onSubmitForm)}
        noValidate
        className="space-y-4"
      >
        {errorServidor && (
          <Alert variant="error" title="No se pudo guardar la página">
            {errorServidor}
          </Alert>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            id="pagina-titulo"
            label="Título de la página"
            placeholder="Ej. Sobre Nosotros"
            required
            error={errors.titulo?.message}
            {...register('titulo')}
          />

          <div className="space-y-1.5">
            <Input
              id="pagina-slug"
              label="Identificador URL (slug)"
              placeholder="Ej. sobre-nosotros"
              required
              error={errors.slug?.message}
              helperText="Ruta pública: /paginas/tu-slug"
              {...register('slug')}
            />
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={autogenerarSlug}
                leftIcon={<WandSparkles className="w-3.5 h-3.5" aria-hidden="true" />}
              >
                Generar slug desde el título
              </Button>
            </div>
          </div>
        </div>

        <Input
          id="pagina-resumen"
          label="Resumen corto (opcional)"
          placeholder="Breve descripción para listados e introducción de la página..."
          error={errors.resumen?.message}
          {...register('resumen')}
        />

        {!esEdicion && (
          <Select
            id="pagina-estado-inicial"
            label="Estado inicial de publicación"
            options={OPCIONES_ESTADO_PAGINA}
            error={errors.estado?.message}
            {...register('estado')}
          />
        )}

        <Textarea
          id="pagina-cuerpo-markdown"
          label="Contenido (formato Markdown)"
          rows={10}
          required
          placeholder="Escribe aquí el contenido. Puedes usar ## Subtítulos, - Listas con viñetas y **texto en negrita**."
          helperText="Soporta encabezados (##, ###), listas (- elemento) y negritas (**texto**)."
          error={errors.cuerpoMarkdown?.message}
          {...register('cuerpoMarkdown')}
        />

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
            {esEdicion ? 'Guardar cambios' : 'Crear página'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
