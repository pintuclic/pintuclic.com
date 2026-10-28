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
const CLAVES_BUSQUEDA = [
  'codigo',
  'nombre',
  'estado',
  'desde',
  'hasta',
  'cliente',
  'correo',
  'telefono',
  'diasEsperando',
] as const;

export function hayFiltrosActivos(filtros: FiltrosBandeja): boolean {
  return CLAVES_BUSQUEDA.some((clave) => filtros[clave] !== undefined);
}

interface GestionState {
  filtros: FiltrosBandeja;
  grupos: GrupoBandeja[];
  /** true = hay más pedidos en curso de los que muestra la bandeja agrupada. */
  bandejaTruncada: boolean;
  resultados: OrdenFilaBandeja[];
  paginacion: Paginacion | null;
  resumen: Array<{ estado: EstadoOrden; cantidad: number }>;
  /** true = el último intento de actualizar el contador falló: lo que se ve puede estar desactualizado. */
  resumenObsoleto: boolean;
  detalle: OrdenDetalleGestion | null;
  historialCliente: OrdenFilaBandeja[];
  /** true = no se pudo cargar el historial: es distinto de «el cliente no tiene otras compras». */
  historialClienteError: boolean;
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
  abrirDetalle: (codigo: string, opciones?: { silencioso?: boolean }) => Promise<void>;
  cerrarDetalle: () => void;
  cambiarEstado: (cambio: CambiarEstadoRequest) => Promise<boolean>;
  agregarNota: (nota: CrearNotaRequest) => Promise<boolean>;
  agregarContacto: (contacto: CrearContactoRequest) => Promise<boolean>;
}

/** Cada consulta lleva su número: solo la última emitida puede escribir en el store (respuestas tardías). */
let consultaActiva = 0;
let detalleActivo = 0;

/** HU-ORD-03, 05, 08, 09, 10, 11: la bandeja y el detalle que usa el personal con «Gestión de pedidos». */
export const useGestionStore = create<GestionState>((set, get) => ({
  filtros: {},
  grupos: [],
  bandejaTruncada: false,
  resultados: [],
  paginacion: null,
  resumen: [],
  resumenObsoleto: false,
  detalle: null,
  historialCliente: [],
  historialClienteError: false,
  cargando: false,
  cargandoDetalle: false,
  operando: false,
  error: null,
  aviso: null,

  cargarResumen: async () => {
    try {
      set({ resumen: await obtenerResumenGestion(), resumenObsoleto: false });
    } catch (err) {
      // No rompe la pantalla, pero tampoco se calla: el contador queda marcado como desactualizado.
      console.warn('[M08] No se pudo actualizar el contador de pedidos:', err);
      set({ resumenObsoleto: true });
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
        set({ resultados: r.filas, paginacion: r.paginacion, grupos: [], bandejaTruncada: false, cargando: false });
      } else {
        const r = await listarBandejaAgrupada();
        if (id !== consultaActiva) return;
        set({ grupos: r.grupos, bandejaTruncada: r.truncada, resultados: [], paginacion: null, cargando: false });
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

  abrirDetalle: async (codigo, opciones) => {
    const id = ++detalleActivo;
    // `silencioso` recarga el mismo pedido (p. ej. tras un conflicto) sin vaciar la pantalla.
    set(
      opciones?.silencioso
        ? { cargandoDetalle: true }
        : {
            cargandoDetalle: true,
            error: null,
            aviso: null,
            detalle: null,
            historialCliente: [],
            historialClienteError: false,
          },
    );
    try {
      const detalle = await obtenerDetalleGestion(codigo);
      if (id !== detalleActivo) return;
      set({ detalle, cargandoDetalle: false });

      // HU-ORD-11: las compras anteriores se piden aparte; si fallan, el detalle sigue y el fallo se ve.
      const historial = await listarHistorialCliente(codigo).then(
        (h) => h,
        (err: unknown) => {
          console.warn('[M08] No se pudo cargar el historial del cliente:', err);
          return null;
        },
      );
      if (id !== detalleActivo) return;
      set(
        historial
          ? { historialCliente: historial.filas, historialClienteError: false }
          : { historialCliente: [], historialClienteError: true },
      );
    } catch (err) {
      if (id !== detalleActivo) return;
      set({ cargandoDetalle: false, error: mensajeDeError(err, 'No pudimos abrir el pedido.') });
    }
  },

  cerrarDetalle: () => {
    detalleActivo += 1; // invalida lo que esté en vuelo
    set({ detalle: null, historialCliente: [], historialClienteError: false, cargandoDetalle: false, error: null, aviso: null });
  },

  cambiarEstado: async (cambio) => {
    const { detalle: actual, operando } = get();
    if (!actual || operando) return false;
    set({ operando: true, error: null, aviso: null });
    try {
      const detalle = await cambiarEstado(actual.codigo, cambio);
      set((s) => ({
        ...(s.detalle?.codigo === actual.codigo ? { detalle } : {}),
        // «Compras del cliente» incluye este pedido: muestra su estado nuevo sin volver a pedir el historial.
        historialCliente: s.historialCliente.map((o) => (o.codigo === detalle.codigo ? { ...o, estado: detalle.estado } : o)),
        operando: false,
        aviso: 'Estado actualizado.',
      }));
      void get().cargarResumen();
      return true;
    } catch (err) {
      const mensaje = mensajeDeError(err, 'No pudimos cambiar el estado.');
      set({ operando: false, error: mensaje });
      // RF-ORD-05-06: si un compañero se adelantó, se recarga el pedido para mostrar su estado real.
      if (codigoDeError(err) === 'ESTADO_CAMBIADO' && get().detalle?.codigo === actual.codigo) {
        await get().abrirDetalle(actual.codigo, { silencioso: true });
        const recarga = get().error;
        set({ error: recarga && recarga !== mensaje ? `${mensaje} ${recarga}` : mensaje });
      }
      return false;
    }
  },

  agregarNota: async (nota) => {
    const { detalle: actual, operando } = get();
    if (!actual || operando) return false;
    set({ operando: true, error: null, aviso: null });
    try {
      const creada = await crearNota(actual.codigo, nota);
      // El pedido abierto pudo cambiar mientras se guardaba: la nota solo se añade a SU pedido.
      set((s) =>
        s.detalle?.codigo === actual.codigo
          ? { detalle: { ...s.detalle, notas: [...s.detalle.notas, creada] }, operando: false, aviso: 'Nota registrada.' }
          : { operando: false },
      );
      return true;
    } catch (err) {
      set({ operando: false, error: mensajeDeError(err, 'No pudimos registrar la nota.') });
      return false;
    }
  },

  agregarContacto: async (contacto) => {
    const { detalle: actual, operando } = get();
    if (!actual || operando) return false;
    set({ operando: true, error: null, aviso: null });
    try {
      const creado = await crearContacto(actual.codigo, contacto);
      set((s) =>
        s.detalle?.codigo === actual.codigo
          ? {
              detalle: { ...s.detalle, contactos: [...s.detalle.contactos, creado] },
              operando: false,
              aviso: 'Contacto registrado.',
            }
          : { operando: false },
      );
      return true;
    } catch (err) {
      set({ operando: false, error: mensajeDeError(err, 'No pudimos registrar el contacto.') });
      return false;
    }
  },
}));
