import {
  DIAS_POR_DEFECTO,
  MAXIMO_DIAS_RANGO,
  MAXIMO_DIAS_RANGO_SERIE,
  MAXIMO_PUNTOS_SERIE,
  type Agrupacion,
  type Periodo,
} from '../dtos/m19-reportes.dto';
import { ReportesError } from './reportes-error';

/** Todo se calcula con fechas de calendario `AAAA-MM-DD` (hora de Colombia, UTC-5 sin horario de verano), sin zonas horarias. */
const MS_DIA = 24 * 60 * 60 * 1000;

export const aFecha = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);
export const aIso = (d: Date): string => d.toISOString().slice(0, 10);
export const sumarDias = (iso: string, dias: number): string => aIso(new Date(aFecha(iso).getTime() + dias * MS_DIA));
export const diasEntre = (desde: string, hasta: string): number => Math.round((aFecha(hasta).getTime() - aFecha(desde).getTime()) / MS_DIA) + 1;

/** «Hoy» en Colombia: UTC-5 fijo. */
export function hoyEnColombia(ahora: Date): string {
  return aIso(new Date(ahora.getTime() - 5 * 60 * 60 * 1000));
}

const esFechaReal = (iso: string): boolean => aIso(aFecha(iso)) === iso;

/** R1: completa y valida el rango. Sin fechas, los últimos DIAS_POR_DEFECTO días contando hoy. */
export function resolverPeriodo(desde: string | undefined, hasta: string | undefined, ahora: Date, maximoDias: number = MAXIMO_DIAS_RANGO): Periodo {
  const fin = hasta ?? hoyEnColombia(ahora);
  const inicio = desde ?? sumarDias(fin, -(DIAS_POR_DEFECTO - 1));
  if (!esFechaReal(inicio) || !esFechaReal(fin)) throw ReportesError.rangoInvalido('Escriba fechas reales con el formato AAAA-MM-DD.');
  if (inicio > fin) throw ReportesError.rangoInvalido('La fecha «hasta» no puede ser anterior a «desde».');
  const dias = diasEntre(inicio, fin);
  if (dias > maximoDias) throw ReportesError.rangoInvalido(`El rango no puede pasar de ${String(maximoDias)} días.`);
  return { desde: inicio, hasta: fin, dias };
}

export const periodoSerie = (desde: string | undefined, hasta: string | undefined, ahora: Date): Periodo =>
  resolverPeriodo(desde, hasta, ahora, MAXIMO_DIAS_RANGO_SERIE);

/** R4: el periodo inmediatamente anterior, de la misma duración. */
export function periodoAnterior(p: Periodo): Periodo {
  return { desde: sumarDias(p.desde, -p.dias), hasta: sumarDias(p.desde, -1), dias: p.dias };
}

/** Inicio del intervalo que contiene la fecha: el lunes (semana), el día 1 (mes) o el 1 de enero (año). */
export function inicioDeIntervalo(iso: string, agrupar: Agrupacion): string {
  const d = aFecha(iso);
  switch (agrupar) {
    case 'dia':
      return iso;
    case 'semana':
      return aIso(new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * MS_DIA));
    case 'mes':
      return aIso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)));
    case 'anio':
      return aIso(new Date(Date.UTC(d.getUTCFullYear(), 0, 1)));
  }
}

function siguienteIntervalo(iso: string, agrupar: Agrupacion): string {
  const d = aFecha(iso);
  switch (agrupar) {
    case 'dia':
      return sumarDias(iso, 1);
    case 'semana':
      return sumarDias(iso, 7);
    case 'mes':
      return aIso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)));
    case 'anio':
      return aIso(new Date(Date.UTC(d.getUTCFullYear() + 1, 0, 1)));
  }
}

/** R5: todos los intervalos del rango, sin huecos y del más viejo al más nuevo. */
export function intervalosDelRango(p: Periodo, agrupar: Agrupacion): string[] {
  const salida: string[] = [];
  for (let actual = inicioDeIntervalo(p.desde, agrupar); actual <= p.hasta; actual = siguienteIntervalo(actual, agrupar)) {
    salida.push(actual);
    if (salida.length > MAXIMO_PUNTOS_SERIE) throw ReportesError.rangoInvalido(`La serie no puede pasar de ${String(MAXIMO_PUNTOS_SERIE)} puntos: use un rango más corto o una agrupación más amplia.`);
  }
  return salida;
}
