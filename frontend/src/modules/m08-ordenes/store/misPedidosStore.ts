import { create } from 'zustand';
import type { OrdenResumen } from '../dtos/m08-ordenes.dto';
import type { FiltroEstadoPedidos } from '../interfaces/ordenes.interface';
import { mensajeDeError } from '../services/mensaje-error';
import { listarMisPedidos } from '../services/ordenes-api';

interface MisPedidosState {
  enCurso: OrdenResumen[];
  finalizados: OrdenResumen[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
  filtro: FiltroEstadoPedidos;
  busqueda: string;
  cargando: boolean;
  error: string | null;

  cargar: () => Promise<void>;
  establecerFiltro: (filtro: FiltroEstadoPedidos) => void;
  establecerBusqueda: (busqueda: string) => Promise<void>;
  establecerPagina: (pagina: number) => Promise<void>;
}

/** Descarta las respuestas que llegan fuera de orden: manda la última consulta emitida. */
let consultaActiva = 0;

/** HU-ORD-07: lista del cliente titular. La paginación y la búsqueda las resuelve el servidor. */
export const useMisPedidosStore = create<MisPedidosState>((set, get) => ({
  enCurso: [],
  finalizados: [],
  total: 0,
  pagina: 1,
  limite: 10,
  totalPaginas: 1,
  filtro: 'todos',
  busqueda: '',
  cargando: false,
  error: null,

  cargar: async () => {
    const id = ++consultaActiva;
    set({ cargando: true, error: null });
    try {
      const { busqueda, pagina, limite } = get();
      const q = busqueda.trim();
      const r = await listarMisPedidos({ ...(q === '' ? {} : { q }), pagina, limite });
      if (id !== consultaActiva) return;
      set({
        enCurso: r.enCurso,
        finalizados: r.finalizados,
        total: r.paginacion.total,
        totalPaginas: Math.max(1, r.paginacion.totalPaginas),
        cargando: false,
      });
    } catch (err) {
      if (id !== consultaActiva) return;
      set({ cargando: false, error: mensajeDeError(err, 'No pudimos cargar tus pedidos. Intenta de nuevo.') });
    }
  },

  // El filtro de estado solo reparte lo ya cargado: no vuelve a consultar.
  establecerFiltro: (filtro) => set({ filtro }),

  establecerBusqueda: async (busqueda) => {
    set({ busqueda, pagina: 1 });
    await get().cargar();
  },

  establecerPagina: async (pagina) => {
    set({ pagina });
    await get().cargar();
  },
}));

/**
 * Lo que se muestra según el filtro. «Todos» junta ambos grupos de la página, de la compra más
 * reciente a la más antigua (el contrato los separa; la vista decide cómo presentarlos).
 */
export function pedidosVisibles(
  enCurso: readonly OrdenResumen[],
  finalizados: readonly OrdenResumen[],
  filtro: FiltroEstadoPedidos,
): OrdenResumen[] {
  if (filtro === 'en_curso') return [...enCurso];
  if (filtro === 'finalizados') return [...finalizados];
  return [...enCurso, ...finalizados].sort(
    (a, b) => b.fecha.localeCompare(a.fecha) || b.codigo.localeCompare(a.codigo),
  );
}
