import { create } from 'zustand';
import type {
  ClienteResumen,
  FichaClienteRespuesta,
  TipoCuentaCliente,
} from '../interfaces/clientes-admin.interface';
import { buscarClientes, desactivarCliente, obtenerFichaCliente } from '../services/clientes-admin.service';
import { mensajeDeError } from '../services/mensaje-error';

interface ClientesState {
  clientes: ClienteResumen[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
  cargando: boolean;
  error: string | null;
  filtroTipo: 'todos' | TipoCuentaCliente;
  termino: string;
  fichaSeleccionada: FichaClienteRespuesta | null;
  cargandoFicha: boolean;

  // Acciones
  cargarClientes: () => Promise<void>;
  establecerFiltroTipo: (tipo: 'todos' | TipoCuentaCliente) => void;
  establecerTermino: (termino: string) => void;
  establecerPagina: (pagina: number) => void;
  limpiarFiltros: () => void;
  verFicha: (idCliente: number) => Promise<void>;
  cerrarFicha: () => void;
  desactivar: (idCliente: number, motivo: string) => Promise<boolean>;
}

/**
 * Secuencia de la última búsqueda emitida. Descarta las respuestas que llegan
 * fuera de orden, para que la tabla no quede mostrando el resultado de un
 * término o una página que el usuario ya cambió.
 */
let peticionBusquedaActiva = 0;

export const useClientesStore = create<ClientesState>((set, get) => ({
  clientes: [],
  total: 0,
  pagina: 1,
  limite: 10,
  totalPaginas: 1,
  cargando: false,
  error: null,
  filtroTipo: 'todos',
  termino: '',
  fichaSeleccionada: null,
  cargandoFicha: false,

  cargarClientes: async () => {
    const idPeticion = ++peticionBusquedaActiva;
    set({ cargando: true, error: null });
    try {
      const { termino, filtroTipo, pagina, limite } = get();
      const resultado = await buscarClientes({
        termino: termino.trim() ? termino.trim() : undefined,
        tipo: filtroTipo,
        pagina,
        limite,
      });
      if (idPeticion !== peticionBusquedaActiva) return;
      set({
        clientes: resultado.clientes,
        total: resultado.total,
        totalPaginas: resultado.totalPaginas,
        cargando: false,
      });
    } catch (err: unknown) {
      if (idPeticion !== peticionBusquedaActiva) return;
      set({
        error: mensajeDeError(err, 'Error al buscar clientes'),
        cargando: false,
      });
    }
  },

  establecerFiltroTipo: (tipo) => {
    set({ filtroTipo: tipo, pagina: 1 });
    void get().cargarClientes();
  },

  establecerTermino: (termino) => {
    set({ termino, pagina: 1 });
    void get().cargarClientes();
  },

  establecerPagina: (pagina) => {
    set({ pagina });
    void get().cargarClientes();
  },

  limpiarFiltros: () => {
    set({ termino: '', filtroTipo: 'todos', pagina: 1 });
    void get().cargarClientes();
  },

  verFicha: async (idCliente) => {
    set({ cargandoFicha: true, error: null });
    try {
      const ficha = await obtenerFichaCliente(idCliente);
      set({ fichaSeleccionada: ficha, cargandoFicha: false });
    } catch (err: unknown) {
      set({
        error: mensajeDeError(err, 'Error al obtener ficha de cliente'),
        cargandoFicha: false,
      });
    }
  },

  cerrarFicha: () => set({ fichaSeleccionada: null }),

  desactivar: async (idCliente, motivo) => {
    set({ cargando: true, error: null });
    try {
      await desactivarCliente(idCliente, motivo);
      set({ cargando: false });
      await get().cargarClientes();
      return true;
    } catch (err: unknown) {
      set({
        error: mensajeDeError(err, 'Error al desactivar cliente'),
        cargando: false,
      });
      return false;
    }
  },
}));
