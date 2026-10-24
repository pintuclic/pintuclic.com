import { create } from 'zustand';
import type { PlantillaNotificacion, TipoComunicacion } from '../interfaces/m18-notificaciones.interface';
import { actualizarPlantilla, listarPlantillas, previsualizarPlantilla } from '../services/m18-notificaciones.service';
import { mensajeDeError } from '../services/mensaje-error';

interface PlantillasState {
  plantillas: PlantillaNotificacion[];
  cargando: boolean;
  guardando: boolean;
  error: string | null;
  exitoMensaje: string | null;
  previewAsunto: string | null;
  previewHtml: string | null;
  cargandoPreview: boolean;

  cargarPlantillas: () => Promise<void>;
  guardarPlantilla: (
    tipo: TipoComunicacion,
    cambios: { asunto: string; contenidoHtml: string; contenidoTexto: string },
  ) => Promise<boolean>;
  previsualizar: (tipo: TipoComunicacion) => Promise<void>;
  limpiarPreview: () => void;
  limpiarMensajes: () => void;
}

export const usePlantillasStore = create<PlantillasState>((set, get) => ({
  plantillas: [],
  cargando: false,
  guardando: false,
  error: null,
  exitoMensaje: null,
  previewAsunto: null,
  previewHtml: null,
  cargandoPreview: false,

  cargarPlantillas: async () => {
    set({ cargando: true, error: null });
    try {
      const { plantillas } = await listarPlantillas();
      set({ plantillas, cargando: false });
    } catch (err: unknown) {
      set({ error: mensajeDeError(err, 'Error al cargar las plantillas'), cargando: false });
    }
  },

  guardarPlantilla: async (tipo, cambios) => {
    set({ guardando: true, error: null, exitoMensaje: null });
    try {
      await actualizarPlantilla(tipo, cambios);
      await get().cargarPlantillas();
      set({ guardando: false, exitoMensaje: `Plantilla "${tipo}" actualizada correctamente` });
      return true;
    } catch (err: unknown) {
      set({ error: mensajeDeError(err, 'Error al actualizar la plantilla'), guardando: false });
      return false;
    }
  },

  previsualizar: async (tipo) => {
    set({ cargandoPreview: true, error: null });
    try {
      const resultado = await previsualizarPlantilla(tipo);
      set({
        previewAsunto: resultado.asunto,
        previewHtml: resultado.contenidoHtml,
        cargandoPreview: false,
      });
    } catch (err: unknown) {
      set({ error: mensajeDeError(err, 'Error al generar la vista previa'), cargandoPreview: false });
    }
  },

  limpiarPreview: () => set({ previewAsunto: null, previewHtml: null }),
  limpiarMensajes: () => set({ error: null, exitoMensaje: null }),
}));
