import { create } from 'zustand';
import type {
  CambiarEstadoRequest,
  CrearContactoRequest,
  CrearNotaRequest,
  EstadoOrden,
  OrdenDetalleGestion,
  OrdenFilaBandeja,
  Paginacion,
} from '../dtos/m08-ordenes.dto';
import type { FiltrosBandeja } from '../interfaces/ordenes.interface';
import { codigoDeError, mensajeDeError } from '../services/mensaje-error';
import {
  cambiarEstado,
  crearContacto,
  crearNota,
  listarBandeja,
  listarBandejaAgrupada,
  listarHistorialCliente,
  obtenerDetalleGestion,
  obtenerResumenGestion,
  type GrupoBandeja,
} from '../services/ordenes-api';

/** Filtros que convierten la bandeja agrupada en una búsqueda paginada (HU-ORD-08). */
const CLAVES_BUSQUEDA = ['codigo', 'estado', 'desde', 'hasta', 'cliente', 'correo', 'telefono', 'diasEsperando'] as const;

export function hayFiltrosActivos(filtros: FiltrosBandeja): boolean {
  return CLAVES_BUSQUEDA.some((clave) => filtros[clave] !== undefined);
}

interface GestionState {
  filtros: FiltrosBandeja;
  grupos: GrupoBandeja[];
  resultados: OrdenFilaBandeja[];
  paginacion: Paginacion | null;
  resumen: Array<{ estado: EstadoOrden; cantidad: number }>;
  detalle: OrdenDetalleGestion | null;
  historialCliente: OrdenFilaBandeja[];
  cargando: boolean;
  cargandoDetalle: boolean;
  operando: boolean;
  error: string | null;
  aviso: string | null;

  cargarResumen: () => Promise<void>;
  cargarBandeja: () => Promise<void>;
  establecerFiltros: (filtros: FiltrosBandeja) => Promise<void>;
  limpiarFiltros: () => Promise<void>;
  establecerPagina: (pagina: number) => Promise<void>;
  abrirDetalle: (codigo: string) => Promise<void>;
  cerrarDetalle: () => void;
  cambiarEstado: (cambio: CambiarEstadoRequest) => Promise<boolean>;
  agregarNota: (nota: CrearNotaRequest) => Promise<boolean>;
  agregarContacto: (contacto: CrearContactoRequest) => Promise<boolean>;
}

let consultaActiva = 0;

/** HU-ORD-03, 05, 08, 09, 10, 11: la bandeja y el detalle que usa el personal con «Gestión de pedidos». */
export const useGestionStore = create<GestionState>((set, get) => ({
  filtros: {},
  grupos: [],
  resultados: [],
  paginacion: null,
  resumen: [],
  detalle: null,
  historialCliente: [],
  cargando: false,
  cargandoDetalle: false,
  operando: false,
  error: null,
  aviso: null,

  cargarResumen: async () => {
    try {
      set({ resumen: await obtenerResumenGestion() });
    } catch {
      // El contador de la navegación no debe romper la pantalla: se queda con el último valor.
    }
  },

  cargarBandeja: async () => {
    const id = ++consultaActiva;
    set({ cargando: true, error: null });
    try {
      const { filtros } = get();
      if (hayFiltrosActivos(filtros)) {
        const r = await listarBandeja({ orden: 'reciente', ...filtros });
        if (id !== consultaActiva) return;
        set({ resultados: r.filas, paginacion: r.paginacion, grupos: [], cargando: false });
      } else {
        const grupos = await listarBandejaAgrupada();
        if (id !== consultaActiva) return;
        set({ grupos, resultados: [], paginacion: null, cargando: false });
      }
    } catch (err) {
      if (id !== consultaActiva) return;
      set({ cargando: false, error: mensajeDeError(err, 'No pudimos cargar los pedidos. Intenta de nuevo.') });
    }
  },

  establecerFiltros: async (filtros) => {
    set({ filtros: { ...filtros, pagina: 1 } });
    await get().cargarBandeja();
  },

  limpiarFiltros: async () => {
    set({ filtros: {} });
    await get().cargarBandeja();
  },

  establecerPagina: async (pagina) => {
    set({ filtros: { ...get().filtros, pagina } });
    await get().cargarBandeja();
  },

  abrirDetalle: async (codigo) => {
    set({ cargandoDetalle: true, error: null, aviso: null, detalle: null, historialCliente: [] });
    try {
      const detalle = await obtenerDetalleGestion(codigo);
      set({ detalle, cargandoDetalle: false });
      // HU-ORD-11: las compras anteriores del cliente se piden aparte; si fallan, el detalle sigue.
      const historial = await listarHistorialCliente(codigo).catch(() => null);
      if (historial && get().detalle?.codigo === codigo) set({ historialCliente: historial.filas });
    } catch (err) {
      set({ cargandoDetalle: false, error: mensajeDeError(err, 'No pudimos abrir el pedido.') });
    }
  },

  cerrarDetalle: () => set({ detalle: null, historialCliente: [], error: null, aviso: null }),

  cambiarEstado: async (cambio) => {
    const actual = get().detalle;
    if (!actual) return false;
    set({ operando: true, error: null, aviso: null });
    try {
      const detalle = await cambiarEstado(actual.codigo, cambio);
      set({ detalle, operando: false, aviso: 'Estado actualizado.' });
      void get().cargarResumen();
      return true;
    } catch (err) {
      set({ operando: false, error: mensajeDeError(err, 'No pudimos cambiar el estado.') });
      // RF-ORD-05-06: si un compañero se adelantó, se recarga para mostrar el estado real.
      if (codigoDeError(err) === 'ESTADO_CAMBIADO') {
        const mensaje = get().error;
        await get().abrirDetalle(actual.codigo);
        set({ error: mensaje });
      }
      return false;
    }
  },

  agregarNota: async (nota) => {
    const actual = get().detalle;
    if (!actual) return false;
    set({ operando: true, error: null, aviso: null });
    try {
      const creada = await crearNota(actual.codigo, nota);
      set({ detalle: { ...actual, notas: [...actual.notas, creada] }, operando: false, aviso: 'Nota registrada.' });
      return true;
    } catch (err) {
      set({ operando: false, error: mensajeDeError(err, 'No pudimos registrar la nota.') });
      return false;
    }
  },

  agregarContacto: async (contacto) => {
    const actual = get().detalle;
    if (!actual) return false;
    set({ operando: true, error: null, aviso: null });
    try {
      const creado = await crearContacto(actual.codigo, contacto);
      set({
        detalle: { ...actual, contactos: [...actual.contactos, creado] },
        operando: false,
        aviso: 'Contacto registrado.',
      });
      return true;
    } catch (err) {
      set({ operando: false, error: mensajeDeError(err, 'No pudimos registrar el contacto.') });
      return false;
    }
  },
}));
