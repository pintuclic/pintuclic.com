import type { NotificacionesPort } from '../../m18-notificaciones/interfaces/notificaciones.port';
import type { AvisoServicioIa } from '../gemini/resiliencia-ia';

/**
 * I9 — aviso al administrador cuando el servicio de IA acumula los fallos configurados.
 *
 * Usa el tipo `alerta_servicio_ia` que M18 sumó en el PR general. El método del puerto es
 * OPCIONAL, así que se comprueba antes de llamarlo: los adaptadores de prueba de otros
 * módulos no lo implementan.
 *
 * Un fallo aquí NO puede romper la petición en curso (A4): lo captura `ResilienciaIa`.
 */
export class AvisoServicioIaM18 implements AvisoServicioIa {
  constructor(
    private readonly notificaciones: NotificacionesPort | null,
    /** A quién se avisa. Queda pendiente de decisión del PO (contrato · Q8). */
    private readonly correoAdministrador: string | null,
  ) {}

  async alertar(fallosConsecutivos: number): Promise<void> {
    const enviar = this.notificaciones?.notificarAlertaServicioIa?.bind(this.notificaciones);
    if (enviar === undefined || this.correoAdministrador === null) {
      // Sin destinatario o sin soporte en M18, queda la alerta del panel, que sí se enciende.
      console.warn('[M03][IA] alerta no enviada por correo; queda visible en el panel', {
        fallosConsecutivos,
      });
      return;
    }

    await enviar(this.correoAdministrador, 'Gemini', fallosConsecutivos);
  }
}
