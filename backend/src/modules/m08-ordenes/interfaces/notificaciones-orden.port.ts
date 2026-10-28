/**
 * Puerto de notificaciones de M08 (D5 del contrato, ADR-009). El correo al cliente solo
 * sale al nacer la orden, al despacharla y al cancelarla (R10). M18 aportará el adaptador real.
 */
export interface EventoOrdenCreada {
  codigo: string;
  idUsuario: number;
  total: number;
}

export interface EventoOrdenDespachada {
  codigo: string;
  idUsuario: number;
}

export interface NotificacionesOrdenPort {
  notificarOrdenCreada(evento: EventoOrdenCreada): Promise<void>;
  notificarOrdenDespachada(evento: EventoOrdenDespachada): Promise<void>;
}
