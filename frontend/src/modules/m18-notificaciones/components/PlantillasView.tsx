'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, CheckCircle2, Edit3, Eye, Mail, Save } from 'lucide-react';
import { Badge, Button, Modal, Skeleton, Textarea } from '@/core/components';
import {
  editarPlantillaFormSchema,
  type EditarPlantillaFormData,
} from '../dtos/m18-notificaciones.dto';
import type { PlantillaNotificacion } from '../interfaces/m18-notificaciones.interface';
import { usePlantillasStore } from '../store/plantillasStore';

export const PlantillasView: React.FC = () => {
  const {
    plantillas,
    cargando,
    guardando,
    error,
    exitoMensaje,
    previewAsunto,
    previewHtml,
    cargandoPreview,
    cargarPlantillas,
    guardarPlantilla,
    previsualizar,
    limpiarPreview,
    limpiarMensajes,
  } = usePlantillasStore();

  const [plantillaEditando, setPlantillaEditando] = useState<PlantillaNotificacion | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditarPlantillaFormData>({
    resolver: zodResolver(editarPlantillaFormSchema),
  });

  useEffect(() => {
    void cargarPlantillas();
  }, [cargarPlantillas]);

  const abrirEdicion = (plantilla: PlantillaNotificacion) => {
    limpiarMensajes();
    setPlantillaEditando(plantilla);
    reset({
      asunto: plantilla.asunto,
      contenidoHtml: plantilla.contenidoHtml,
      contenidoTexto: plantilla.contenidoTexto,
    });
  };

  const onSubmit = async (data: EditarPlantillaFormData) => {
    if (!plantillaEditando) return;
    const ok = await guardarPlantilla(plantillaEditando.tipo, data);
    if (ok) setPlantillaEditando(null);
  };

  const abrirPreview = (tipo: PlantillaNotificacion['tipo']) => {
    void previsualizar(tipo);
  };

  return (
    <div className="space-y-6">
      {exitoMensaje && (
        <div className="p-3.5 bg-conversion/10 border border-conversion/30 rounded-card flex items-center gap-2 text-xs text-conversion font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{exitoMensaje}</span>
        </div>
      )}
      {error && (
        <div className="p-3.5 bg-danger/10 border border-danger/30 rounded-card flex items-center gap-2 text-xs text-danger font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {cargando ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plantillas.map((plantilla) => (
            <div
              key={plantilla.tipo}
              className="bg-neutral-white border border-neutral-light/70 rounded-card p-5 shadow-card flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="flex items-center gap-1.5 font-mono text-xs font-bold text-corporate">
                    <Mail className="w-3.5 h-3.5" /> {plantilla.tipo}
                  </span>
                  <Badge variant="action">{plantilla.variablesObligatorias.length} obligatorias</Badge>
                </div>
                <p className="font-sans text-sm text-neutral-dark font-medium">{plantilla.asunto}</p>
                <p className="font-sans text-[11px] text-neutral-medium mt-2">
                  Variables: {plantilla.variablesDisponibles.join(', ') || 'ninguna'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => abrirPreview(plantilla.tipo)} leftIcon={<Eye className="w-3.5 h-3.5" />}>
                  Vista previa
                </Button>
                <Button variant="outline" size="sm" onClick={() => abrirEdicion(plantilla)} leftIcon={<Edit3 className="w-3.5 h-3.5" />}>
                  Editar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={Boolean(plantillaEditando)}
        onClose={() => setPlantillaEditando(null)}
        title="Editar plantilla de comunicación"
        subtitle={plantillaEditando?.tipo}
        size="lg"
      >
        {plantillaEditando && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
            <div className="p-3 bg-neutral-lightest border border-neutral-light rounded-btn text-xs text-neutral-dark">
              Variables obligatorias (no se pueden quitar del contenido):{' '}
              {plantillaEditando.variablesObligatorias.map((v) => `{{${v}}}`).join(', ') || 'ninguna'}
            </div>
            <Textarea label="Asunto" rows={1} error={errors.asunto?.message} {...register('asunto')} />
            <Textarea label="Contenido HTML" rows={8} error={errors.contenidoHtml?.message} {...register('contenidoHtml')} />
            <Textarea label="Contenido en texto" rows={5} error={errors.contenidoTexto?.message} {...register('contenidoTexto')} />
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-light/50">
              <Button type="button" variant="outline" onClick={() => setPlantillaEditando(null)} disabled={guardando}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary-action" isLoading={guardando} leftIcon={<Save className="w-4 h-4" />}>
                Guardar plantilla
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={Boolean(previewAsunto) || cargandoPreview}
        onClose={limpiarPreview}
        title="Vista previa"
        subtitle={previewAsunto ?? undefined}
        size="lg"
      >
        {cargandoPreview ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="border border-neutral-light/70 rounded-card overflow-hidden">
            <iframe
              title="Vista previa de la plantilla"
              sandbox=""
              srcDoc={previewHtml ?? ''}
              className="w-full h-96 bg-neutral-white"
            />
          </div>
        )}
      </Modal>
    </div>
  );
};
