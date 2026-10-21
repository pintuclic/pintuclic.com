import { create } from 'zustand';
import type {
  CrearEmpleadoFormData,
  EditarEmpleadoFormData,
} from '../dtos/empleados.dto';
import type {
  DetalleEmpleado,
  EstadoCuentaEmpleado,
  ResumenEmpleado,
} from '../interfaces/empleados.interface';
import {
  crearEmpleado,
  desactivarEmpleado,
  editarEmpleado,
  listarEmpleados,
  reactivarEmpleado,
} from '../services/empleados.service';
import { mensajeDeError } from '../services/mensaje-error';

interface EmpleadosState {
  empleados: ResumenEmpleado[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
  cargando: boolean;
  error: string | null;
  filtroEstado: EstadoCuentaEmpleado | undefined;
  busqueda: string;
  empleadoSeleccionado: DetalleEmpleado | null;
  credencialTemporalGenerada: string | null;

  // Acciones
  cargarEmpleados: () => Promise<void>;
  establecerFiltroEstado: (estado: EstadoCuentaEmpleado | undefined) => void;
  establecerBusqueda: (busqueda: string) => void;
  establecerPagina: (pagina: number) => void;
  limpiarFiltros: () => void;
  seleccionarEmpleado: (empleado: DetalleEmpleado | null) => void;
  limpiarCredencialTemporal: () => void;
  crearNuevoEmpleado: (datos: CrearEmpleadoFormData) => Promise<boolean>;
  actualizarEmpleado: (id: number, datos: EditarEmpleadoFormData) => Promise<boolean>;
  desactivar: (id: number) => Promise<boolean>;
  reactivar: (id: number) => Promise<boolean>;
}

/**
 * Secuencia de la última petición de listado emitida.
 *
 * Cada cambio de búsqueda, página o filtro dispara una consulta nueva sin
 * cancelar la anterior. Sin este contador, una respuesta lenta que llega
 * después de otra más reciente sobrescribe la lista y deja la tabla mostrando
 * datos que no corresponden a los filtros visibles.
 */
let peticionListadoActiva = 0;

export const useEmpleadosStore = create<EmpleadosState>((set, get) => ({
  empleados: [],
  total: 0,
  pagina: 1,
  limite: 10,
  totalPaginas: 1,
  cargando: false,
  error: null,
  filtroEstado: undefined,
  busqueda: '',
  empleadoSeleccionado: null,
  credencialTemporalGenerada: null,

  cargarEmpleados: async () => {
    const idPeticion = ++peticionListadoActiva;
    set({ cargando: true, error: null });
    try {
      const { busqueda, filtroEstado, pagina, limite } = get();
      const resultado = await listarEmpleados({
        busqueda: busqueda.trim() ? busqueda.trim() : undefined,
        estado: filtroEstado,
        pagina,
        limite,
      });
      if (idPeticion !== peticionListadoActiva) return;
      set({
        empleados: resultado.empleados,
        total: resultado.total,
        totalPaginas: resultado.totalPaginas,
        cargando: false,
      });
    } catch (err: unknown) {
      if (idPeticion !== peticionListadoActiva) return;
      set({
        error: mensajeDeError(err, 'Error al cargar empleados'),
        cargando: false,
      });
    }
  },

  establecerFiltroEstado: (estado) => {
    set({ filtroEstado: estado, pagina: 1 });
    void get().cargarEmpleados();
  },

  establecerBusqueda: (busqueda) => {
    set({ busqueda, pagina: 1 });
    void get().cargarEmpleados();
  },

  establecerPagina: (pagina) => {
    set({ pagina });
    void get().cargarEmpleados();
  },

  limpiarFiltros: () => {
    set({ busqueda: '', filtroEstado: undefined, pagina: 1 });
    void get().cargarEmpleados();
  },

  seleccionarEmpleado: (empleado) => set({ empleadoSeleccionado: empleado }),

  limpiarCredencialTemporal: () => set({ credencialTemporalGenerada: null }),

  crearNuevoEmpleado: async (datos) => {
    set({ cargando: true, error: null });
    try {
      const res = await crearEmpleado(datos);
      set({
        credencialTemporalGenerada: res.credencialTemporalGenerada ?? null,
        cargando: false,
      });
      await get().cargarEmpleados();
      return true;
    } catch (err: unknown) {
      set({
        error: mensajeDeError(err, 'Error al crear colaborador'),
        cargando: false,
      });
      return false;
    }
  },

  actualizarEmpleado: async (id, datos) => {
    set({ cargando: true, error: null });
    try {
      await editarEmpleado(id, datos);
      set({ cargando: false });
      await get().cargarEmpleados();
      return true;
    } catch (err: unknown) {
      set({
        error: mensajeDeError(err, 'Error al actualizar colaborador'),
        cargando: false,
      });
      return false;
    }
  },

  desactivar: async (id) => {
    set({ cargando: true, error: null });
    try {
      await desactivarEmpleado(id);
      set({ cargando: false });
      await get().cargarEmpleados();
      return true;
    } catch (err: unknown) {
      set({
        error: mensajeDeError(err, 'Error al desactivar colaborador'),
        cargando: false,
      });
      return false;
    }
  },

  reactivar: async (id) => {
    set({ cargando: true, error: null });
    try {
      await reactivarEmpleado(id);
      set({ cargando: false });
      await get().cargarEmpleados();
      return true;
    } catch (err: unknown) {
      set({
        error: mensajeDeError(err, 'Error al reactivar colaborador'),
        cargando: false,
      });
      return false;
    }
  },
}));
