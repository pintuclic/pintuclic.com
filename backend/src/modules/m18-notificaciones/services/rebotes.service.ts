import { EVENTOS_REBOTE, type EventoProveedor, type WebhookRebotesOutput } from '../dtos/m18-notificaciones.dto';
import type { RegistroEnviosRepositoryPort } from '../interfaces/registro-envios.port';

const LARGO_MAXIMO_MOTIVO = 500;
const EVENTOS_QUE_REBOTAN: readonly string[] = EVENTOS_REBOTE;

/** RF-NOT-04-04: guarda los rebotes que reporta el proveedor, enlazados al último envío entregado a esa dirección. */
export class RebotesService {
  constructor(private readonly registroRepo: RegistroEnviosRepositoryPort) {}

  async registrarEventos(eventos: readonly EventoProveedor[]): Promise<WebhookRebotesOutput> {
    let registrados = 0;
    for (const evento of eventos) {
      if (!EVENTOS_QUE_REBOTAN.includes(evento.event)) continue;
      const destinatario = evento.email.trim().toLowerCase();
      const idEnvio = await this.registroRepo.buscarUltimoEnvioEnviado(destinatario);
      const motivo = [evento.event, evento.reason?.trim()].filter(Boolean).join(': ').slice(0, LARGO_MAXIMO_MOTIVO);
      await this.registroRepo.registrarRebote(idEnvio, destinatario, motivo);
      registrados += 1;
    }
    return { registrados, ignorados: eventos.length - registrados };
  }
}
