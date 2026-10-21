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
import { mensajeDeError } from '../services/mensaje-error';

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
      set({
        error: mensajeDeError(err, 'Error al cargar catálogo de parámetros'),
        cargando: false,
      });
    }
  },

  establecerAreaActiva: (area) => set({ areaActiva: area }),

  guardarParametro: async (clave, valor) => {
    set({ actualizando: true, error: null, exitoMensaje: null });
    try {
      await actualizarParametro(clave, valor);
      // El refresco se hace ANTES de anunciar el éxito: `cargarParametros`
      // limpia `exitoMensaje` al arrancar, así que fijarlo antes lo borraba
      // y el banner de confirmación nunca llegaba a verse.
      await get().cargarParametros();
      if (get().error) {
        // El parámetro sí se guardó, pero la lista quedó obsoleta: se informa
        // el fallo del refresco en lugar de un éxito engañoso.
        set({ actualizando: false });
        return true;
      }
      set({
        actualizando: false,
        exitoMensaje: `Parámetro ${clave} actualizado correctamente`,
      });
      return true;
    } catch (err: unknown) {
      set({
        error: mensajeDeError(err, 'Error al actualizar parámetro'),
        actualizando: false,
      });
      return false;
    }
  },

  limpiarMensajes: () => set({ error: null, exitoMensaje: null }),
}));
