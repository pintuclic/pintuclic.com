import { isAxiosError } from 'axios';
import { create } from 'zustand';
import type { MisPermisosRespuesta } from '../interfaces/permisos.interface';
import { obtenerMisPermisos } from '../services/permisos.service';

/**
 * Qué puede hacer la persona que entró al panel (M17 R-ACC-9). Vive en memoria y se pide al servidor al abrir el panel:
 * nunca se guarda en el navegador, para que revocar un permiso se note en la siguiente carga (RF-ADM-03-03).
 *
 * `no_personal`: el servidor respondió el 404 opaco, es decir, la cuenta no es de personal (un cliente).
 */
export type EstadoAcceso = 'sin_cargar' | 'cargando' | 'listo' | 'no_personal' | 'error';

interface AccesoState {
  estado: EstadoAcceso;
  acceso: MisPermisosRespuesta | null;
  cargar: () => Promise<void>;
  limpiar: () => void;
}

export const useAccesoStore = create<AccesoState>((set, get) => ({
  estado: 'sin_cargar',
  acceso: null,
  cargar: async () => {
    if (get().estado === 'cargando') return;
    set({ estado: 'cargando' });
    try {
      set({ acceso: await obtenerMisPermisos(), estado: 'listo' });
    } catch (err: unknown) {
      const noPersonal = isAxiosError(err) && err.response?.status === 404;
      set({ acceso: null, estado: noPersonal ? 'no_personal' : 'error' });
    }
  },
  limpiar: () => set({ estado: 'sin_cargar', acceso: null }),
}));
