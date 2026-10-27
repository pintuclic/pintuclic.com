import type { Comparacion, EstadoCotizacionPanel, PuntoSerie } from '../dtos/m17-panel-resumen.dto';
import { ESTADOS_COTIZACION_PANEL } from '../dtos/m17-panel-resumen.dto';

/** Colombia está en UTC-5 todo el año (sin horario de verano). */
const DESFASE_COLOMBIA_MS = 5 * 60 * 60 * 1000;
const DIA_MS = 24 * 60 * 60 * 1000;

/** Los intervalos del periodo y del anterior, semiabiertos: [desde, hasta). Los días son de calendario en Colombia (R2). */
export interface RangosPeriodo {
  /** Medianoche de Colombia del primer día del periodo, como instante UTC. */
  desde: Date;
  /** Medianoche de Colombia del día siguiente a hoy. */
  hasta: Date;
  anteriorDesde: Date;
  /** Hoy en Colombia, AAAA-MM-DD. */
  hoy: string;
  dias: number;
}

/** AAAA-MM-DD del día de calendario de Colombia al que pertenece el instante. */
export function diaColombia(instante: Date): string {
  return new Date(instante.getTime() - DESFASE_COLOMBIA_MS).toISOString().slice(0, 10);
}

/** Medianoche de Colombia del día AAAA-MM-DD, como instante UTC. */
export function inicioDiaColombia(dia: string): Date {
  return new Date(Date.parse(`${dia}T00:00:00.000Z`) + DESFASE_COLOMBIA_MS);
}

export function rangosDelPeriodo(ahora: Date, dias: number): RangosPeriodo {
  const hoy = diaColombia(ahora);
  const hasta = new Date(inicioDiaColombia(hoy).getTime() + DIA_MS);
  const desde = new Date(hasta.getTime() - dias * DIA_MS);
  return { desde, hasta, anteriorDesde: new Date(desde.getTime() - dias * DIA_MS), hoy, dias };
}

/** `hoy` más `dias` días (AAAA-MM-DD), para comparar contra columnas de fecha. */
export function sumarDias(dia: string, dias: number): string {
  return new Date(Date.parse(`${dia}T00:00:00.000Z`) + dias * DIA_MS).toISOString().slice(0, 10);
}

export interface FilaSerie {
  fecha: Date;
  valor: number;
}

/** R4: un punto por día del periodo, sin huecos, del más viejo al de hoy. */
export function armarSerie(filas: readonly FilaSerie[], rangos: RangosPeriodo): PuntoSerie[] {
  const porDia = new Map<string, { cotizaciones: number; valor: number }>();
  for (let i = 0; i < rangos.dias; i++) {
    porDia.set(sumarDias(rangos.hoy, i - (rangos.dias - 1)), { cotizaciones: 0, valor: 0 });
  }
  for (const fila of filas) {
    const celda = porDia.get(diaColombia(fila.fecha));
    if (celda === undefined) continue;
    celda.cotizaciones += 1;
    celda.valor += fila.valor;
  }
  return [...porDia.entries()].map(([fecha, c]) => ({ fecha, cotizaciones: c.cotizaciones, valor: redondearImporte(c.valor) }));
}

export const redondearImporte = (valor: number): number => Math.round(valor * 100) / 100;

const unDecimal = (valor: number): number => Math.round(valor * 10) / 10;

/** R3: aprobadas ÷ (aprobadas + rechazadas + vencidas) × 100, con un decimal; null si no hay ninguna resuelta. */
export function tasaAprobacion(porEstado: ReadonlyMap<EstadoCotizacionPanel, number>): number | null {
  const aprobadas = porEstado.get('aprobada') ?? 0;
  const resueltas = aprobadas + (porEstado.get('rechazada') ?? 0) + (porEstado.get('vencida') ?? 0);
  return resueltas === 0 ? null : unDecimal((aprobadas / resueltas) * 100);
}

/** R3: los seis estados siempre, en el orden del contrato, con 0 si no hay. */
export function estadosCompletos(porEstado: ReadonlyMap<EstadoCotizacionPanel, number>): Array<{ estado: EstadoCotizacionPanel; total: number }> {
  return ESTADOS_COTIZACION_PANEL.map((estado) => ({ estado, total: porEstado.get(estado) ?? 0 }));
}

/** R10: clics ÷ impresiones × 100 con un decimal; null si no hubo impresiones. */
export const ctr = (clics: number, impresiones: number): number | null => (impresiones === 0 ? null : unDecimal((clics / impresiones) * 100));

export const comparar = (actual: number, anterior: number): Comparacion => ({ actual: redondearImporte(actual), anterior: redondearImporte(anterior) });
