import { create } from 'zustand';
import type {
  EnvioNotificacion,
  EstadoEnvio,
  ReboteNotificacion,
  TipoComunicacion,
} from '../interfaces/m18-notificaciones.interface';
import { listarEnvios, listarRebotes } from '../services/m18-notificaciones.service';
import { mensajeDeError } from '../services/mensaje-error';

interface RegistroEnviosState {
  envios: EnvioNotificacion[];
  totalEnvios: number;
  paginaEnvios: number;
  limiteEnvios: number;
  cargandoEnvios: boolean;
  filtroTipo: TipoComunicacion | undefined;
  filtroEstado: EstadoEnvio | undefined;

  rebotes: ReboteNotificacion[];
  totalRebotes: number;
  paginaRebotes: number;
  limiteRebotes: number;
  cargandoRebotes: boolean;

  error: string | null;

  cargarEnvios: () => Promise<void>;
  establecerPaginaEnvios: (pagina: number) => void;
  establecerFiltroTipo: (tipo: TipoComunicacion | undefined) => void;
  establecerFiltroEstado: (estado: EstadoEnvio | undefined) => void;
  cargarRebotes: () => Promise<void>;
  establecerPaginaRebotes: (pagina: number) => void;
}

export const useRegistroEnviosStore = create<RegistroEnviosState>((set, get) => ({
  envios: [],
  totalEnvios: 0,
  paginaEnvios: 1,
  limiteEnvios: 20,
  cargandoEnvios: false,
  filtroTipo: undefined,
  filtroEstado: undefined,

  rebotes: [],
  totalRebotes: 0,
  paginaRebotes: 1,
  limiteRebotes: 20,
  cargandoRebotes: false,

  error: null,

  cargarEnvios: async () => {
    set({ cargandoEnvios: true, error: null });
    try {
      const { paginaEnvios, limiteEnvios, filtroTipo, filtroEstado } = get();
      const resultado = await listarEnvios({
        pagina: paginaEnvios,
        limite: limiteEnvios,
        tipo: filtroTipo,
        estado: filtroEstado,
      });
      set({ envios: resultado.envios, totalEnvios: resultado.total, cargandoEnvios: false });
    } catch (err: unknown) {
      set({ error: mensajeDeError(err, 'Error al cargar el registro de envíos'), cargandoEnvios: false });
    }
  },

  establecerPaginaEnvios: (pagina) => {
    set({ paginaEnvios: pagina });
    void get().cargarEnvios();
  },

  establecerFiltroTipo: (tipo) => {
    set({ filtroTipo: tipo, paginaEnvios: 1 });
    void get().cargarEnvios();
  },

  establecerFiltroEstado: (estado) => {
    set({ filtroEstado: estado, paginaEnvios: 1 });
    void get().cargarEnvios();
  },

  cargarRebotes: async () => {
    set({ cargandoRebotes: true, error: null });
    try {
      const { paginaRebotes, limiteRebotes } = get();
      const resultado = await listarRebotes({ pagina: paginaRebotes, limite: limiteRebotes });
      set({ rebotes: resultado.rebotes, totalRebotes: resultado.total, cargandoRebotes: false });
    } catch (err: unknown) {
      set({ error: mensajeDeError(err, 'Error al cargar el registro de rebotes'), cargandoRebotes: false });
    }
  },

  establecerPaginaRebotes: (pagina) => {
    set({ paginaRebotes: pagina });
    void get().cargarRebotes();
  },
}));
