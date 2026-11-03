import type { EventosOrdenPort, EventoCambioEstado } from '../../../modules/m08-ordenes/interfaces/eventos-orden.port';
import type {
  EventoOrdenCancelada,
  EventoOrdenCreada,
  EventoOrdenDespachada,
  NotificacionesOrdenPort,
} from '../../../modules/m08-ordenes/interfaces/notificaciones-orden.port';
import type { PublicadorNotificacionesPort } from '../notificaciones.interface';

const DATOS_VENDEDOR_INCOMPLETOS = 'DATOS_VENDEDOR_INCOMPLETOS';
const SIN_AVISAR = new Set(['cancelado', 'devuelto']);

function codigoDe(error: unknown): string | null {
  return typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string' ? error.code : null;
}

/**
 * FP-02 · R12 (fase 1). Envuelve el puerto de avisos de M08 sin tocar M08: lo que ya hacía (comprobante y correos) sigue igual y,
 * además, publica el aviso interno. Publicar nunca lanza (R10), así que el flujo de la orden no cambia.
 */
export class NotificacionesOrdenFp02Adapter implements NotificacionesOrdenPort {
  constructor(
    private readonly interno: NotificacionesOrdenPort,
    private readonly publicador: PublicadorNotificacionesPort,
    /** M12: para saber, tras intentar emitirlo, si el comprobante quedó listo o faltan los datos del vendedor. */
    private readonly comprobantes?: { emitir(codigoOrden: string): Promise<unknown> },
  ) {}

  async notificarOrdenCreada(evento: EventoOrdenCreada): Promise<void> {
    await this.publicador.publicar({ tipo: 'pedido_nuevo', destino: { tipo: 'permiso', permiso: 'ventas.ver' }, referencia: evento.codigo });
    await this.interno.notificarOrdenCreada(evento);
    await this.avisosDeComprobante(evento);
  }

  notificarOrdenDespachada(evento: EventoOrdenDespachada): Promise<void> {
    return this.interno.notificarOrdenDespachada(evento);
  }

  async notificarOrdenCancelada(evento: EventoOrdenCancelada): Promise<void> {
    await this.interno.notificarOrdenCancelada?.(evento);
    await this.publicador.publicar({ tipo: 'pedido_anulado', destino: { tipo: 'permiso', permiso: 'ventas.ver' }, referencia: evento.codigo });
    await this.publicador.publicar({ tipo: 'pedido_estado', destino: { tipo: 'usuario', idUsuario: evento.idUsuario }, referencia: evento.codigo });
  }

  /** `emitir` es idempotente (M12 · R1): si ya está emitido solo lo devuelve; si faltan los datos del vendedor, lanza. */
  private async avisosDeComprobante(evento: EventoOrdenCreada): Promise<void> {
    if (this.comprobantes === undefined) return;
    try {
      await this.comprobantes.emitir(evento.codigo);
      await this.publicador.publicar({ tipo: 'comprobante_listo', destino: { tipo: 'usuario', idUsuario: evento.idUsuario }, referencia: evento.codigo });
    } catch (error) {
      if (codigoDe(error) === DATOS_VENDEDOR_INCOMPLETOS) {
        await this.publicador.publicar({ tipo: 'comprobante_pendiente', destino: { tipo: 'permiso', permiso: 'configuracion.editar' } });
      }
    }
  }
}

/** FP-02 · R12: cada cambio de estado avisa al titular (agrupado por orden) y, si la orden se anula o se devuelve, al personal. */
export class EventosOrdenFp02Adapter implements EventosOrdenPort {
  constructor(private readonly publicador: PublicadorNotificacionesPort) {}

  async emitirCambioEstado(evento: EventoCambioEstado): Promise<void> {
    await this.publicador.publicar({ tipo: 'pedido_estado', destino: { tipo: 'usuario', idUsuario: evento.idUsuario }, referencia: evento.codigo });
    if (SIN_AVISAR.has(evento.estadoNuevo)) {
      await this.publicador.publicar({ tipo: 'pedido_anulado', destino: { tipo: 'permiso', permiso: 'ventas.ver' }, referencia: evento.codigo });
    }
  }
}
