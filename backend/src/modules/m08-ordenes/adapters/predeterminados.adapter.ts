import type { EventosOrdenPort } from '../interfaces/eventos-orden.port';
import type { NotificacionesOrdenPort } from '../interfaces/notificaciones-orden.port';
import type { RelojPort } from '../interfaces/reloj.port';

/**
 * Adaptadores por defecto mientras M18 no está en main (D5 del contrato, ADR-009): no envían nada.
 * Cuando M18 llegue, se sustituyen por los reales sin tocar los servicios. Avisan al construirse para
 * que un despliegue que olvide la sustitución no quede mudo: sin aviso, ningún correo saldría y nadie
 * se enteraría.
 */
export class SinNotificacionesOrdenAdapter implements NotificacionesOrdenPort {
  constructor() {
    console.warn(
      '[M08] Notificaciones de pedidos DESACTIVADAS: M18 no está conectado y no se enviará ningún correo al cliente (orden creada ni despachada).',
    );
  }

  async notificarOrdenCreada(): Promise<void> {
    return undefined;
  }

  async notificarOrdenDespachada(): Promise<void> {
    return undefined;
  }
}

export class SinEventosOrdenAdapter implements EventosOrdenPort {
  constructor() {
    console.warn('[M08] Eventos de cambio de estado sin destino: M18 no está conectado, nadie los recibirá.');
  }

  async emitirCambioEstado(): Promise<void> {
    return undefined;
  }
}

export class RelojSistemaAdapter implements RelojPort {
  ahora(): Date {
    return new Date();
  }
}
