import type { EstadoOrden } from '../dtos/m08-ordenes.dto';

/** RF-ORD-03-02: cada cambio de estado emite un evento para que M18 decida qué notificar. */
export interface EventoCambioEstado {
  codigo: string;
  /** Cliente titular de la orden. */
  idUsuario: number;
  estadoAnterior: EstadoOrden;
  estadoNuevo: EstadoOrden;
  idUsuarioAutor: number;
  fecha: Date;
}

export interface EventosOrdenPort {
  emitirCambioEstado(evento: EventoCambioEstado): Promise<void>;
}
