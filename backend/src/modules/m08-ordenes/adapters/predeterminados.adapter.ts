import type { EventosOrdenPort } from '../interfaces/eventos-orden.port';
import type { NotificacionesOrdenPort } from '../interfaces/notificaciones-orden.port';
import type { RelojPort } from '../interfaces/reloj.port';

/**
 * Adaptadores por defecto mientras M18 no está en main (D5 del contrato, ADR-009): no envían nada.
 * Cuando M18 llegue, se sustituyen por los reales sin tocar los servicios.
 */
export class SinNotificacionesOrdenAdapter implements NotificacionesOrdenPort {
  async notificarOrdenCreada(): Promise<void> {
    return undefined;
  }

  async notificarOrdenDespachada(): Promise<void> {
    return undefined;
  }
}

export class SinEventosOrdenAdapter implements EventosOrdenPort {
  async emitirCambioEstado(): Promise<void> {
    return undefined;
  }
}

export class RelojSistemaAdapter implements RelojPort {
  ahora(): Date {
    return new Date();
  }
}
