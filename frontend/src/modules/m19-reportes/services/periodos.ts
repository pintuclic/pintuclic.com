import type { Agrupacion } from '../dtos/m19-reportes.dto';

/** Fechas de calendario `AAAA-MM-DD`; «hoy» es el de Colombia (UTC-5 fijo), igual que en el servidor. */
const MS_DIA = 24 * 60 * 60 * 1000;
const aFecha = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);
const aIso = (d: Date): string => d.toISOString().slice(0, 10);
const sumarDias = (iso: string, dias: number): string => aIso(new Date(aFecha(iso).getTime() + dias * MS_DIA));
export const hoyColombia = (ahora: Date = new Date()): string => aIso(new Date(ahora.getTime() - 5 * 60 * 60 * 1000));

export const ATAJOS = ['7d', '30d', '90d', 'este_mes', 'mes_pasado', 'este_anio', 'anio_pasado', 'libre'] as const;
export type Atajo = (typeof ATAJOS)[number];

export const ETIQUETA_ATAJO: Record<Atajo, string> = {
  '7d': 'Últimos 7 días',
  '30d': 'Últimos 30 días',
  '90d': 'Últimos 90 días',
  este_mes: 'Este mes',
  mes_pasado: 'El mes pasado',
  este_anio: 'Este año',
  anio_pasado: 'El año pasado',
  libre: 'Fechas a elegir',
};

export interface RangoElegido {
  desde: string;
  hasta: string;
  /** La agrupación que mejor cuenta la historia de ese rango. */
  agrupar: Agrupacion;
}

/** Cada atajo: su rango y cómo se agrupa por defecto (semana = días; mes y año = semanas o meses). */
export function rangoDeAtajo(atajo: Exclude<Atajo, 'libre'>, hoy: string): RangoElegido {
  const anio = Number(hoy.slice(0, 4));
  const primeroDelMes = `${hoy.slice(0, 7)}-01`;
  switch (atajo) {
    case '7d':
      return { desde: sumarDias(hoy, -6), hasta: hoy, agrupar: 'dia' };
    case '30d':
      return { desde: sumarDias(hoy, -29), hasta: hoy, agrupar: 'dia' };
    case '90d':
      return { desde: sumarDias(hoy, -89), hasta: hoy, agrupar: 'semana' };
    case 'este_mes':
      return { desde: primeroDelMes, hasta: hoy, agrupar: 'dia' };
    case 'mes_pasado': {
      const ultimo = sumarDias(primeroDelMes, -1);
      return { desde: `${ultimo.slice(0, 7)}-01`, hasta: ultimo, agrupar: 'dia' };
    }
    case 'este_anio':
      return { desde: `${String(anio)}-01-01`, hasta: hoy, agrupar: 'mes' };
    case 'anio_pasado':
      return { desde: `${String(anio - 1)}-01-01`, hasta: `${String(anio - 1)}-12-31`, agrupar: 'mes' };
  }
}

/** Qué atajo corresponde a un rango (para marcarlo en pantalla), o `libre`. */
export function atajoDe(desde: string, hasta: string, hoy: string): Atajo {
  for (const a of ATAJOS) {
    if (a === 'libre') continue;
    const r = rangoDeAtajo(a, hoy);
    if (r.desde === desde && r.hasta === hasta) return a;
  }
  return 'libre';
}

export const diasDelRango = (desde: string, hasta: string): number => Math.round((aFecha(hasta).getTime() - aFecha(desde).getTime()) / MS_DIA) + 1;

/** Agrupaciones que tienen sentido para un rango (no más de ~120 barras legibles). */
export function agrupacionesPosibles(dias: number): Agrupacion[] {
  const salida: Agrupacion[] = [];
  if (dias <= 120) salida.push('dia');
  if (dias >= 14 && dias <= 900) salida.push('semana');
  if (dias >= 28) salida.push('mes');
  if (dias >= 365) salida.push('anio');
  return salida.length === 0 ? ['dia'] : salida;
}
