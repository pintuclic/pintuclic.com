import { createHash, randomBytes } from 'node:crypto';
import type { LimitadorPort } from '../controllers/asistente.controller';

/**
 * H8 — tope de peticiones por minuto y por origen, contado SOLO en memoria.
 *
 * Del origen se guarda una huella con una sal que cambia en cada arranque del servidor —
 * nunca la dirección IP— y todo se olvida al pasar el minuto: no queda rastro de quién fue
 * (M20). Es el mismo criterio que usa M14 para su medición.
 *
 * Vive en memoria, así que vale para un solo servidor (contrato · Q9).
 */
export class LimitadorPorMinuto implements LimitadorPort {
  private readonly sal = randomBytes(16);
  private ventanas = new Map<string, { inicio: number; cuenta: number }>();
  private ultimaLimpieza = 0;

  constructor(
    private readonly maximo: number,
    private readonly ahora: () => number = () => Date.now(),
  ) {}

  permitir(origen: string): boolean {
    const t = this.ahora();
    this.limpiar(t);

    const clave = createHash('sha256').update(this.sal).update(origen).digest('base64url');
    const actual = this.ventanas.get(clave);

    if (actual === undefined || t - actual.inicio >= 60_000) {
      this.ventanas.set(clave, { inicio: t, cuenta: 1 });
      return true;
    }
    if (actual.cuenta + 1 > this.maximo) return false;

    actual.cuenta += 1;
    return true;
  }

  /** Olvida las ventanas vencidas, como mucho una vez por minuto, para no crecer sin límite. */
  private limpiar(t: number): void {
    if (t - this.ultimaLimpieza < 60_000) return;
    this.ultimaLimpieza = t;
    for (const [clave, v] of this.ventanas) {
      if (t - v.inicio >= 60_000) this.ventanas.delete(clave);
    }
  }
}
