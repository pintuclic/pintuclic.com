import { prisma } from '../../../core/db/client';
import type { NotificacionesPort } from '../../m18-notificaciones/interfaces/notificaciones.port';
import type {
  EventoOrdenCancelada,
  EventoOrdenCreada,
  EventoOrdenDespachada,
  NotificacionesOrdenPort,
} from '../interfaces/notificaciones-orden.port';

export interface ClienteDeOrden {
  nombre: string;
  correo: string;
}

/**
 * Salida real de los avisos de M08 por M18 (D5 del contrato, ADR-009). Hoy solo cubre la cancelación (R10, revisión
 * 2026-10-31): «orden creada» y «orden despachada» siguen en manos de quien se pasa como `base` (M12 emite el comprobante al
 * crearse; el correo de despacho sigue sin plantilla). Un fallo del correo lo recoge quien llama y no deshace nada.
 */
export class NotificacionesOrdenM18Adapter implements NotificacionesOrdenPort {
  constructor(
    private readonly notificaciones: Pick<NotificacionesPort, 'notificarOrdenCancelada'>,
    private readonly base: NotificacionesOrdenPort,
    private readonly buscarCliente: (idUsuario: number) => Promise<ClienteDeOrden | null> = clienteDesdeBaseDeDatos,
  ) {}

  notificarOrdenCreada(evento: EventoOrdenCreada): Promise<void> {
    return this.base.notificarOrdenCreada(evento);
  }

  notificarOrdenDespachada(evento: EventoOrdenDespachada): Promise<void> {
    return this.base.notificarOrdenDespachada(evento);
  }

  async notificarOrdenCancelada(evento: EventoOrdenCancelada): Promise<void> {
    if (!this.notificaciones.notificarOrdenCancelada) return;
    const cliente = await this.buscarCliente(evento.idUsuario);
    if (!cliente) return;
    await this.notificaciones.notificarOrdenCancelada(cliente.correo, {
      nombre: cliente.nombre,
      codigoOrden: evento.codigo,
      motivo: evento.motivo,
      origen: evento.origen,
    });
  }
}

async function clienteDesdeBaseDeDatos(idUsuario: number): Promise<ClienteDeOrden | null> {
  const usuario = await prisma.usuario.findUnique({ where: { idUsuario }, select: { nombre: true, correo: true } });
  return usuario ? { nombre: usuario.nombre, correo: usuario.correo } : null;
}
