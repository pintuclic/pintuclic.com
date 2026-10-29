import { create } from 'zustand';
import { mensajeDeError } from '../services/mensaje-error';
import type { EstadoMarca, LineaVerificadaInput, VerificacionOrden } from '../dtos/m09-cumplimiento.dto';
import { marcarLineas, obtenerVerificacion } from '../services/cumplimiento-api';
import { AVISO_AVANZO } from '../services/presentacion';

interface CumplimientoState {
  codigo: string | null;
  verificacion: VerificacionOrden | null;
  cargando: boolean;
  guardando: boolean;
  error: string | null;
  aviso: string | null;
  cargar: (codigo: string) => Promise<void>;
  /** Devuelve true si la marca movió el pedido a preparación: quien llama debe refrescar el detalle. */
  marcar: (lineas: readonly LineaVerificadaInput[]) => Promise<boolean>;
  /** Pone la misma marca a todas las líneas que aún no la tienen. */
  marcarTodas: (estado: EstadoMarca) => Promise<boolean>;
  limpiar: () => void;
}

const INICIAL = { codigo: null, verificacion: null, cargando: false, guardando: false, error: null, aviso: null };

export const useCumplimientoStore = create<CumplimientoState>((set, get) => ({
  ...INICIAL,

  cargar: async (codigo) => {
    set({ ...INICIAL, codigo, cargando: true });
    try {
      const verificacion = await obtenerVerificacion(codigo);
      // Si mientras tanto se abrió otro pedido, esta respuesta ya no importa.
      if (get().codigo === codigo) set({ verificacion, cargando: false });
    } catch (err: unknown) {
      if (get().codigo === codigo) set({ cargando: false, error: mensajeDeError(err) });
    }
  },

  marcar: async (lineas) => {
    const { codigo, guardando } = get();
    if (codigo === null || guardando) return false;
    set({ guardando: true, error: null, aviso: null });
    try {
      const { verificacion, avanzo } = await marcarLineas(codigo, lineas);
      if (get().codigo !== codigo) return false;
      set({ verificacion, guardando: false, aviso: avanzo ? AVISO_AVANZO : null });
      return avanzo;
    } catch (err: unknown) {
      if (get().codigo === codigo) set({ guardando: false, error: mensajeDeError(err) });
      return false;
    }
  },

  marcarTodas: async (estado) => {
    const { verificacion } = get();
    if (verificacion === null) return false;
    const porMarcar = verificacion.lineas.filter((l) => l.estado !== estado);
    if (porMarcar.length === 0) return false;
    return get().marcar(porMarcar.map((l) => ({ numeroLinea: l.numeroLinea, estado })));
  },

  limpiar: () => set({ ...INICIAL }),
}));
