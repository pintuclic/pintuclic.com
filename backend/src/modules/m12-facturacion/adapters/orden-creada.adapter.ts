import type { NotificacionesOrdenPort } from '../../m08-ordenes/interfaces/notificaciones-orden.port';
import type { ComprobantesService } from '../services/comprobantes.service';

/**
 * M12 · R2: se engancha al aviso «orden creada» que M08 ya emite (sin tocar M08). Emite el comprobante y avisa al cliente.
 * Si algo falla se registra y se sigue: la orden ya existe y el comprobante se emite al primer GET (R2). El correo de «orden
 * despachada» de M08 no es de M12: aquí no hace nada.
 */
export class ComprobanteAlCrearOrdenAdapter implements NotificacionesOrdenPort {
  constructor(private readonly comprobantes: Pick<ComprobantesService, 'emitir' | 'avisarAlCliente'>) {}

  async notificarOrdenCreada(evento: { codigo: string }): Promise<void> {
    try {
      const { comprobante, creado } = await this.comprobantes.emitir(evento.codigo);
      if (creado) await this.comprobantes.avisarAlCliente(comprobante);
    } catch (error) {
      console.error(`[M12] No se pudo emitir el comprobante de la orden ${evento.codigo}:`, error instanceof Error ? error.message : error);
    }
  }

  async notificarOrdenDespachada(): Promise<void> {
    return undefined;
  }
}
