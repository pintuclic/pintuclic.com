import { create } from 'zustand';
import { PAGINA_POR_DEFECTO, type Notificacion, type Resumen, type Seccion } from './fp02-notificaciones.dto';
import * as api from './notificaciones-api';

export const RESUMEN_VACIO: Resumen = { campana: { sinVer: 0, sinLeer: 0 }, secciones: [] };

interface NotificacionesState {
  resumen: Resumen;
  /** Verdadero cuando ya llegó al menos un resumen del servidor (antes no se pinta nada). */
  cargado: boolean;
  abierta: boolean;
  lista: Notificacion[];
  total: number;
  hayMas: boolean;
  pagina: number;
  cargandoLista: boolean;
  errorLista: boolean;
  aplicarResumen: (resumen: Resumen) => void;
  reiniciar: () => void;
  abrirCampana: () => Promise<void>;
  cerrarCampana: () => void;
  cargarMas: () => Promise<void>;
  leerTodas: () => Promise<void>;
  leer: (idNotificacion: string) => Promise<void>;
  leerSeccion: (seccion: Seccion) => Promise<void>;
  /** Lo registra el gestor del sondeo: vuelve a consultar ya, sin esperar el intervalo. */
  pedirRefresco: () => void;
}

let refrescar: () => void = () => undefined;

export function registrarRefresco(fn: () => void): () => void {
  refrescar = fn;
  return () => {
    if (refrescar === fn) refrescar = () => undefined;
  };
}

export const useNotificacionesStore = create<NotificacionesState>((set, get) => ({
  resumen: RESUMEN_VACIO,
  cargado: false,
  abierta: false,
  lista: [],
  total: 0,
  hayMas: false,
  pagina: 1,
  cargandoLista: false,
  errorLista: false,

  aplicarResumen: (resumen) => set({ resumen, cargado: true }),
  reiniciar: () => set({ resumen: RESUMEN_VACIO, cargado: false, abierta: false, lista: [], total: 0, hayMas: false, pagina: 1 }),
  pedirRefresco: () => refrescar(),

  abrirCampana: async () => {
    set({ abierta: true, cargandoLista: true, errorLista: false });
    try {
      // «Visto» apaga el número al abrir; el resalte de cada aviso sigue hasta que se lea (R7).
      const [lista] = await Promise.all([api.listarNotificaciones(1, PAGINA_POR_DEFECTO), api.marcarCampanaVista()]);
      set((s) => ({
        lista: lista.items,
        total: lista.total,
        hayMas: lista.hayMas,
        pagina: 1,
        cargandoLista: false,
        resumen: { ...s.resumen, campana: { ...s.resumen.campana, sinVer: 0 } },
      }));
      get().pedirRefresco();
    } catch {
      set({ cargandoLista: false, errorLista: true });
    }
  },

  cerrarCampana: () => set({ abierta: false }),

  cargarMas: async () => {
    const { pagina: actual, hayMas, cargandoLista } = get();
    if (!hayMas || cargandoLista) return;
    set({ cargandoLista: true, errorLista: false });
    try {
      const siguiente = await api.listarNotificaciones(actual + 1, PAGINA_POR_DEFECTO);
      set((s) => {
        const conocidos = new Set(s.lista.map((n) => n.idNotificacion));
        return {
          lista: [...s.lista, ...siguiente.items.filter((n) => !conocidos.has(n.idNotificacion))],
          total: siguiente.total,
          hayMas: siguiente.hayMas,
          pagina: actual + 1,
          cargandoLista: false,
        };
      });
    } catch {
      set({ cargandoLista: false, errorLista: true });
    }
  },

  leerTodas: async () => {
    try {
      await api.marcarTodasLeidas();
      set((s) => ({ lista: s.lista.map((n) => ({ ...n, vista: true, leida: true })) }));
      get().pedirRefresco();
    } catch {
      set({ errorLista: true });
    }
  },

  leer: async (idNotificacion) => {
    try {
      const actualizada = await api.marcarLeida(idNotificacion);
      set((s) => ({ lista: s.lista.map((n) => (n.idNotificacion === idNotificacion ? actualizada : n)) }));
      get().pedirRefresco();
    } catch {
      // El enlace se abre igual: marcar leído es secundario.
    }
  },

  leerSeccion: async (seccion) => {
    // Optimista: el punto se apaga al entrar; si falla, el siguiente sondeo lo devuelve.
    set((s) => ({ resumen: { ...s.resumen, secciones: s.resumen.secciones.filter((x) => x.seccion !== seccion) } }));
    try {
      await api.marcarSeccionLeida(seccion);
      get().pedirRefresco();
    } catch {
      get().pedirRefresco();
    }
  },
}));

export function cantidadDeSeccion(resumen: Resumen, seccion: Seccion): number {
  return resumen.secciones.find((s) => s.seccion === seccion)?.cantidad ?? 0;
}

export function totalNovedades(resumen: Resumen, secciones: ReadonlyArray<Seccion>): number {
  return resumen.secciones.filter((s) => secciones.includes(s.seccion)).reduce((suma, s) => suma + s.cantidad, 0);
}
