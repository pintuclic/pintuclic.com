const FORMATO_BOGOTA = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Bogota',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** El día de `momento` en hora de Colombia, como AAAA-MM-DD (R10). */
export function diaEnBogota(momento: Date): string {
  return FORMATO_BOGOTA.format(momento);
}

/** Suma días a una fecha AAAA-MM-DD sin pasar por zonas horarias. */
export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** R11: pesos con 2 decimales, mitad hacia arriba. */
export function redondear(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}
