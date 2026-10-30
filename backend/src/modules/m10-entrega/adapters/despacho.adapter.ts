import type { EventoCambioEstado, EventosOrdenPort } from '../../m08-ordenes/interfaces/eventos-orden.port';
import type { EnviosService } from '../services/envios.service';

/**
 * R3: se engancha al evento de cambio de estado que M08 ya emite (`estados.eventos`), sin modificar M08. Al pasar la
 * orden a «Enviado» crea el envío. Un fallo aquí lo registra M08 y nunca revierte el despacho.
 */
export class EnvioAlDespacharAdapter implements EventosOrdenPort {
  constructor(private readonly envios: Pick<EnviosService, 'alCambiarEstado'>) {}

  async emitirCambioEstado(evento: EventoCambioEstado): Promise<void> {
    await this.envios.alCambiarEstado({ codigo: evento.codigo, estadoNuevo: evento.estadoNuevo });
  }
}
