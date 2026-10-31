import { create } from 'zustand';
import { mensajeDeError } from '../services/mensaje-error';
import type { EstadoMarca, LineaVerificadaInput, VerificacionOrden } from '../dtos/m09-cumplimiento.dto';
import { marcarLineas, obtenerVerificacion, solicitarCancelacion } from '../services/cumplimiento-api';
import { avisoDeAvance } from '../services/presentacion';

interface CumplimientoState {
  codigo: string | null;
  verificacion: VerificacionOrden | null;
  cargando: boolean;
  guardando: boolean;
  /** Mientras se pide la cancelación del pedido (R18). */
  solicitando: boolean;
  error: string | null;
  aviso: string | null;
  /**
   * Cuántas marcas se han guardado desde que se abrió el pedido. Quien muestra el pedido lo observa para volver a pedirlo:
   * el estado de cada producto que ve en la lista sale del detalle, no de esta lista de chequeo.
   */
  guardados: number;
  cargar: (codigo: string) => Promise<void>;
  /** Devuelve true si la marca movió el pedido (a preparación o a «preparada»): quien llama debe refrescar el detalle. */
  marcar: (lineas: readonly LineaVerificadaInput[]) => Promise<boolean>;
  /** Pone la misma marca a todas las líneas que aún no la tienen. */
  marcarTodas: (estado: EstadoMarca) => Promise<boolean>;
  /** R18. Pide la cancelación del pedido; devuelve true si quedó pedida. */
  pedirCancelacion: (nota?: string) => Promise<boolean>;
  limpiar: () => void;
}

const INICIAL = {
  codigo: null,
  verificacion: null,
  cargando: false,
  guardando: false,
  solicitando: false,
  error: null,
  aviso: null,
  guardados: 0,
};

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
      set((s) => ({
        verificacion,
        guardando: false,
        aviso: avanzo ? avisoDeAvance(verificacion.estado) : null,
        guardados: s.guardados + 1,
      }));
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

  pedirCancelacion: async (nota) => {
    const { codigo, solicitando } = get();
    if (codigo === null || solicitando) return false;
    set({ solicitando: true, error: null, aviso: null });
    try {
      const cancelacion = await solicitarCancelacion(codigo, nota);
      if (get().codigo !== codigo) return false;
      set((s) => ({
        verificacion: s.verificacion === null ? null : { ...s.verificacion, cancelacion },
        solicitando: false,
        aviso: `Cancelación solicitada (${cancelacion.codigo}). El cliente recibirá un correo con el motivo cuando se apruebe.`,
      }));
      return true;
    } catch (err: unknown) {
      if (get().codigo === codigo) set({ solicitando: false, error: mensajeDeError(err) });
      return false;
    }
  },

  limpiar: () => set({ ...INICIAL }),
}));
