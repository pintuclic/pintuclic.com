import type { EstadoOrden, ModoEntrega } from '../dtos/m08-ordenes.dto';

export interface ActorGestion {
  idUsuario: number;
}

/** Lo que el cambio de estado necesita saber de la orden. */
export interface OrdenParaEstado {
  codigo: string;
  estado: EstadoOrden;
  modoEntrega: ModoEntrega | null;
  idUsuario: number;
}

export interface FilaHistorialEstado {
  codigo: string;
  estadoAnterior: EstadoOrden;
  estadoNuevo: EstadoOrden;
  idUsuarioAutor: number;
  motivo: string | null;
}

export interface EstadosTx {
  buscarOrden(codigo: string): Promise<OrdenParaEstado | null>;
  /** Cambia el estado solo si sigue siendo `desde`; false = otra persona se adelantó (R8). */
  actualizarEstadoSiCoincide(codigo: string, desde: EstadoOrden, hacia: EstadoOrden): Promise<boolean>;
  registrarHistorial(fila: FilaHistorialEstado): Promise<void>;
}

export interface EstadosRepository {
  enTransaccion<T>(trabajo: (tx: EstadosTx) => Promise<T>): Promise<T>;
}
