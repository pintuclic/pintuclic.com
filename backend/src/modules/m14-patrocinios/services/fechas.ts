/**
 * Hora de Colombia (America/Bogota). Colombia no usa horario de verano: el desfase con UTC es fijo (-05:00), así que
 * se calcula con aritmética simple y las pruebas no dependen del huso del servidor.
 */
const DESFASE_BOGOTA_MS = -5 * 60 * 60 * 1000;

const dos = (n: number): string => String(n).padStart(2, '0');

/** La fecha de calendario (AAAA-MM-DD) de un instante, en hora de Colombia. */
export function fechaBogota(instante: Date): string {
  const local = new Date(instante.getTime() + DESFASE_BOGOTA_MS);
  return `${local.getUTCFullYear()}-${dos(local.getUTCMonth() + 1)}-${dos(local.getUTCDate())}`;
}

/** La fecha de calendario (AAAA-MM-DD) de una columna DATE de Prisma, que llega como medianoche UTC. */
export function fechaDeColumna(valor: Date): string {
  return valor.toISOString().slice(0, 10);
}

/** Medianoche UTC de una fecha AAAA-MM-DD, para escribir una columna DATE. */
export function columnaDeFecha(fecha: string): Date {
  return new Date(`${fecha}T00:00:00.000Z`);
}
