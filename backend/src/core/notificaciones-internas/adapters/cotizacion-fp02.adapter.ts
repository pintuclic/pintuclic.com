import { prisma } from '../../db/client';
import type { NotificacionesCotizacionPort } from '../../../modules/m21-cotizaciones/dtos/m21-cotizaciones.dto';
import type { PublicadorNotificacionesPort } from '../notificaciones.interface';

type EventoRespondida = Parameters<NotificacionesCotizacionPort['cotizacionRespondida']>[0];
type EventoRechazada = Parameters<NotificacionesCotizacionPort['cotizacionRechazada']>[0];

/**
 * FP-02 · R12 (fase 1): el puerto de avisos de M21 ya existe y hoy no tiene destino. El evento trae el correo y no el id de la
 * cuenta; el titular se lee de la propia cotización.
 */
export class NotificacionesCotizacionFp02Adapter implements NotificacionesCotizacionPort {
  constructor(
    private readonly publicador: PublicadorNotificacionesPort,
    private readonly titularDe: (idCotizacion: number) => Promise<number | null> = titularDesdeBaseDeDatos,
  ) {}

  cotizacionRespondida(evento: EventoRespondida): Promise<void> {
    return this.avisar('cotizacion_respondida', evento.idCotizacion, evento.codigo);
  }

  cotizacionRechazada(evento: EventoRechazada): Promise<void> {
    return this.avisar('cotizacion_rechazada', evento.idCotizacion, evento.codigo);
  }

  private async avisar(tipo: 'cotizacion_respondida' | 'cotizacion_rechazada', idCotizacion: number, codigo: string): Promise<void> {
    const idUsuario = await this.titularDe(idCotizacion).catch(() => null);
    if (idUsuario === null) return;
    await this.publicador.publicar({ tipo, destino: { tipo: 'usuario', idUsuario }, referencia: codigo });
  }
}

async function titularDesdeBaseDeDatos(idCotizacion: number): Promise<number | null> {
  const c = await prisma.cotizacion.findUnique({ where: { idCotizacion }, select: { idUsuario: true } });
  return c?.idUsuario ?? null;
}
