import type { NotificacionesPort } from '../../m18-notificaciones/interfaces/notificaciones.port';
import type { AvisoComprobantePort } from '../interfaces/facturacion.interface';

/** M12 · R9: el aviso al cliente sale por M18 (tipo `comprobante_venta`, plantilla editable). Sin M18, no se avisa y no pasa nada. */
export class AvisoM18Adapter implements AvisoComprobantePort {
  constructor(private readonly notificaciones: Pick<NotificacionesPort, 'notificarComprobanteVenta'>) {}

  async avisar(correo: string, datos: { nombre: string; numero: string; total: string; codigoOrden: string }): Promise<void> {
    await this.notificaciones.notificarComprobanteVenta?.(correo, datos);
  }
}
