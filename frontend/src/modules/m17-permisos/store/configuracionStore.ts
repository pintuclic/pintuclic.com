import { create } from 'zustand';
import type { ClaveParametro } from '../dtos/configuracion.dto';
import type {
  AreaParametro,
  ParametroConfiguracion,
} from '../interfaces/configuracion.interface';
import {
  actualizarParametro,
  obtenerCatalogoParametros,
} from '../services/configuracion.service';

interface ConfiguracionState {
  parametros: ParametroConfiguracion[];
  areaActiva: AreaParametro | 'todas';
  cargando: boolean;
  actualizando: boolean;
  error: string | null;
  exitoMensaje: string | null;

  // Acciones
  cargarParametros: () => Promise<void>;
  establecerAreaActiva: (area: AreaParametro | 'todas') => void;
  guardarParametro: (
    clave: ClaveParametro,
    valor: number | string | boolean,
  ) => Promise<boolean>;
  limpiarMensajes: () => void;
}

export const useConfiguracionStore = create<ConfiguracionState>((set, get) => ({
  parametros: [],
  areaActiva: 'todas',
  cargando: false,
  actualizando: false,
  error: null,
  exitoMensaje: null,

  cargarParametros: async () => {
    set({ cargando: true, error: null, exitoMensaje: null });
    try {
      const res = await obtenerCatalogoParametros();
      set({ parametros: res.parametros, cargando: false });
    } catch (err: unknown) {
      const mensaje =
        err instanceof Error ? err.message : 'Error al cargar catálogo de parámetros';
      set({ error: mensaje, cargando: false });
    }
  },

  establecerAreaActiva: (area) => set({ areaActiva: area }),

  guardarParametro: async (clave, valor) => {
    set({ actualizando: true, error: null, exitoMensaje: null });
    try {
      await actualizarParametro(clave, valor);
      set({
        actualizando: false,
        exitoMensaje: `Parámetro ${clave} actualizado correctamente`,
      });
      await get().cargarParametros();
      return true;
    } catch (err: unknown) {
      const mensaje =
        err instanceof Error ? err.message : 'Error al actualizar parámetro';
      set({ error: mensaje, actualizando: false });
      return false;
    }
  },

  limpiarMensajes: () => set({ error: null, exitoMensaje: null }),
}));
