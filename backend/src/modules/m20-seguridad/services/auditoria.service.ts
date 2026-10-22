import type { AuditoriaPort, EventoAccesoDenegado } from '../interfaces/auditoria.port';

/**
 * ADR-002 — Adaptador vigente del puerto de auditoría.
 *
 * HU-SEG-04 está aplazada, así que el evento va al registro técnico interno en
 * lugar de a una bitácora persistente. Cuando el Product Owner la desbloquee,
 * se sustituye ESTA clase por una que escriba en `log_auditoria`, y ningún
 * llamador cambia.
 *
 * ⚠️ Mientras tanto, CA-SEG-03-05 NO se considera cumplido: se certifica la
 * emisión, no la persistencia.
 */
export class AuditoriaRegistroTecnico implements AuditoriaPort {
  async registrarAccesoDenegado(evento: EventoAccesoDenegado): Promise<void> {
    // RF-SEG-04-07: el evento jamás transporta credenciales ni datos de pago.
    console.warn(
      '[ACCESO-DENEGADO]',
      JSON.stringify({
        idUsuario: evento.idUsuario,
        operacion: evento.operacionIntentada,
        permisoRequerido: evento.permisoRequerido,
        fecha: evento.fecha.toISOString(),
        ipOrigen: evento.ipOrigen,
      }),
    );
    return Promise.resolve();
  }
}
