import type { EstadoMarca, EstadoOrden } from '../dtos/m09-cumplimiento.dto';

/** Una marca del rastro de una línea (R3). */
export interface RegistroDatos {
  estado: EstadoMarca;
  autor: string;
  fecha: Date;
}

export interface LineaDatos {
  /** Clave interna de la línea: nunca sale por la API, que identifica por `numeroLinea` (D4). */
  idLinea: number;
  /** Posición 1..n por orden de creación. */
  numeroLinea: number;
  nombreProducto: string;
  varianteCopia: string;
  colorSolicitado: string | null;
  cantidad: number;
  esEntonado: boolean;
  baseConsumida: string | null;
  /** Del más antiguo al más reciente; vacío = pendiente. */
  registros: RegistroDatos[];
}

export interface OrdenDatos {
  codigo: string;
  estado: EstadoOrden;
  /** Cliente titular: el evento de cambio de estado lo necesita. */
  idUsuario: number;
  lineas: LineaDatos[];
}

export interface FilaRetenidaDatos {
  codigo: string;
  cliente: string;
  fecha: Date;
  /** Desde cuándo está la orden en revisión de disponibilidad. */
  entradaEstado: Date;
  lineas: LineaDatos[];
}

export interface MarcaNueva {
  idLinea: number;
  estado: EstadoMarca;
}

export type ResultadoAvance = { ok: true } | { ok: false; razon: 'NO_EXISTE' | 'ESTADO_CAMBIADO' };

/** Todo lo que M09 hace de una vez sobre una orden: una sola transacción (R7). */
export interface CumplimientoTx {
  /** Lee la orden bloqueándola hasta el final de la transacción, para que dos marcas simultáneas no se pisen. */
  cargarOrden(codigo: string): Promise<OrdenDatos | null>;
  insertarMarcas(marcas: readonly MarcaNueva[], idUsuarioAutor: number): Promise<void>;
  /** Pasa la orden a preparación con la función de M08 (candado optimista e historial). */
  avanzarAPreparacion(codigo: string, idUsuarioAutor: number): Promise<ResultadoAvance>;
}

export interface CumplimientoRepository {
  cargarOrden(codigo: string): Promise<OrdenDatos | null>;
  listarRetenidas(pagina: number, limite: number): Promise<{ filas: FilaRetenidaDatos[]; total: number }>;
  enTransaccion<T>(trabajo: (tx: CumplimientoTx) => Promise<T>): Promise<T>;
}
