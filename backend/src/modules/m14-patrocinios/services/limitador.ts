import { createHash, randomBytes } from 'node:crypto';

/**
 * M6: tope de avisos por minuto de un mismo origen, contado SOLO en memoria. Del origen se guarda una huella con una
 * sal que cambia en cada arranque del servidor (nunca la dirección IP) y todo se olvida al pasar el minuto: no queda
 * rastro de quién fue (M20).
 */
export class LimitadorPorMinuto {
  private readonly sal = randomBytes(16);
  private ventanas = new Map<string, { inicio: number; cuenta: number }>();
  private ultimaLimpieza = 0;

  constructor(
    private readonly maximo: number,
    private readonly ahora: () => number = () => Date.now(),
  ) {}

  /** Anota `n` avisos del origen; false (y no anota) si con ellos pasaría del tope del minuto en curso. */
  permitir(origen: string, n: number): boolean {
    const t = this.ahora();
    this.limpiar(t);
    const clave = createHash('sha256').update(this.sal).update(origen).digest('base64url');
    const actual = this.ventanas.get(clave);
    if (actual === undefined || t - actual.inicio >= 60_000) {
      if (n > this.maximo) return false;
      this.ventanas.set(clave, { inicio: t, cuenta: n });
      return true;
    }
    if (actual.cuenta + n > this.maximo) return false;
    actual.cuenta += n;
    return true;
  }

  /** Olvida las ventanas vencidas (como mucho una vez por minuto) para que la memoria no crezca. */
  private limpiar(t: number): void {
    if (t - this.ultimaLimpieza < 60_000) return;
    this.ultimaLimpieza = t;
    for (const [clave, v] of this.ventanas) {
      if (t - v.inicio >= 60_000) this.ventanas.delete(clave);
    }
  }
}

/** Rastreadores y herramientas que se declaran como tales en su agente de navegador (M6). No se guarda el agente. */
const ROBOT = /bot\b|bot[/;)\s-]|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|monitor|curl\/|wget\/|python-requests|go-http-client|okhttp|axios\//i;

export function esRobot(agente: string | undefined): boolean {
  return agente === undefined || agente.trim() === '' || ROBOT.test(agente);
}

/**
 * El origen de una petición para el tope por minuto. En producción el navegador llega por el servidor de la interfaz
 * (que reenvía `/api/*`), así que `req.ip` sería siempre ese servidor y todos los visitantes compartirían un solo tope:
 * se toma la última dirección de `X-Forwarded-For`, la que añadió el intermediario más cercano. Si alguien la inventa
 * solo se salta este tope, y las cifras ya se declaran indicativas (M7). Nunca se guarda: solo alimenta la huella.
 */
export function origenDe(ip: string | undefined, reenviadoPor: string | undefined): string {
  const ultimo = reenviadoPor?.split(',').at(-1)?.trim();
  return ultimo !== undefined && ultimo !== '' ? ultimo : (ip ?? '');
}
