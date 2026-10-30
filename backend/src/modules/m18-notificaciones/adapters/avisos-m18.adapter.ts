import type { NotificacionesCotizacionPort } from '../../m21-cotizaciones/dtos/m21-cotizaciones.dto';
import type { NotificacionesOrdenPort } from '../../m08-ordenes/interfaces/notificaciones-orden.port';
import type { BuscadorDestinatarioPort } from '../interfaces/destinatario.port';
import type { NotificacionesPort } from '../interfaces/notificaciones.port';

const pesos = (n: number): string => `$ ${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n)}`;

/** `2026-11-15` → «15 de noviembre de 2026»; si no es una fecha reconocible, se deja tal cual. */
function fechaLarga(iso: string): string {
  const fecha = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeZone: 'UTC' }).format(fecha);
}

/**
 * HU-NOT-02 · M08 D05: el despacho avisa al cliente por M18. El nacimiento de la orden no se avisa aquí (lo cubre el
 * comprobante de M12) y la cancelación llegará con M11. Un fallo lo registra M08; este adaptador no lo traga.
 */
export class AvisosOrdenM18Adapter implements Pick<NotificacionesOrdenPort, 'notificarOrdenDespachada'> {
  constructor(
    private readonly notificaciones: Pick<NotificacionesPort, 'notificarOrdenDespachada'>,
    private readonly destinatarios: BuscadorDestinatarioPort,
  ) {}

  async notificarOrdenDespachada(evento: { codigo: string; idUsuario: number }): Promise<void> {
    const cliente = await this.destinatarios.buscar(evento.idUsuario);
    if (cliente === null) return;
    await this.notificaciones.notificarOrdenDespachada?.(cliente.correo, { nombre: cliente.nombre, codigoOrden: evento.codigo });
  }
}

/** HU-NOT-02 · RF-NOT-02-03 · M21 D8: «respondida» y «rechazada» salen por M18. */
export class AvisosCotizacionM18Adapter implements NotificacionesCotizacionPort {
  constructor(private readonly notificaciones: Pick<NotificacionesPort, 'notificarCotizacionRespondida' | 'notificarCotizacionRechazada'>) {}

  async cotizacionRespondida(
    e: Parameters<NotificacionesCotizacionPort['cotizacionRespondida']>[0],
  ): Promise<void> {
    await this.notificaciones.notificarCotizacionRespondida?.(e.correoCliente, {
      nombre: e.nombreCliente,
      codigo: e.codigo,
      idCotizacion: e.idCotizacion,
      total: pesos(e.totalAcordado),
      vencimiento: fechaLarga(e.fechaVencimiento),
    });
  }

  async cotizacionRechazada(e: Parameters<NotificacionesCotizacionPort['cotizacionRechazada']>[0]): Promise<void> {
    await this.notificaciones.notificarCotizacionRechazada?.(e.correoCliente, {
      nombre: e.nombreCliente,
      codigo: e.codigo,
      idCotizacion: e.idCotizacion,
      motivo: e.motivo,
    });
  }
}
