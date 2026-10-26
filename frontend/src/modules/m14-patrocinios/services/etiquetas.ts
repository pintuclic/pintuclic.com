import type {
  Situacion,
  TipoObjetivoPatrocinio,
  UbicacionPatrocinio,
} from '../dtos/m14-patrocinios.dto';

export const ETIQUETAS_SITUACION: Record<Situacion, string> = {
  programado: 'Programada',
  vigente: 'Vigente',
  vencido: 'Vencida',
  inactivo: 'Inactiva',
};

export const AYUDA_SITUACION: Record<Situacion, string> = {
  programado: 'Todavía no empieza: arranca en su fecha de inicio.',
  vigente: 'Se está mostrando ahora.',
  vencido: 'Terminó: caducó sola al pasar su fecha fin.',
  inactivo: 'Está apagada: no se muestra aunque esté dentro de sus fechas.',
};

export const ETIQUETAS_UBICACION: Record<UbicacionPatrocinio, string> = {
  listado: 'Catálogo y búsqueda',
  inicio: 'Página de inicio',
  complementarios: 'Ficha del producto',
};

export const AYUDA_UBICACION: Record<UbicacionPatrocinio, string> = {
  listado: 'Van primero en la lista del catálogo y de la búsqueda, con la etiqueta «Patrocinado».',
  inicio: 'Salen en el bloque «Productos patrocinados» de la página de inicio.',
  complementarios: 'Van primero en «Completa tu trabajo con» de la ficha de otros productos.',
};

export const UBICACIONES: readonly UbicacionPatrocinio[] = ['listado', 'inicio', 'complementarios'];

export const ETIQUETAS_TIPO_OBJETIVO: Record<TipoObjetivoPatrocinio, string> = {
  producto: 'Producto',
  linea: 'Línea',
  marca: 'Marca',
};

export const TIPOS_OBJETIVO: readonly TipoObjetivoPatrocinio[] = ['marca', 'linea', 'producto'];

/** AAAA-MM-DD → DD/MM/AAAA, sin pasar por `Date` (la fecha es de calendario, no un instante). */
export function formatearFecha(fecha: string): string {
  const [a, m, d] = fecha.split('-');
  return a !== undefined && m !== undefined && d !== undefined ? `${d}/${m}/${a}` : fecha;
}

export function resumenVigencia(fechaInicio: string, fechaFin: string): string {
  return fechaInicio === fechaFin
    ? `El ${formatearFecha(fechaInicio)}`
    : `Del ${formatearFecha(fechaInicio)} al ${formatearFecha(fechaFin)}`;
}

const NUMERO = new Intl.NumberFormat('es-CO');
export const formatearNumero = (valor: number): string => NUMERO.format(valor);

const dos = (n: number): string => String(n).padStart(2, '0');

/** La fecha de hoy en Colombia (UTC-5, sin horario de verano), sea cual sea el huso del navegador. */
export function hoyBogota(ahora: Date = new Date()): string {
  const local = new Date(ahora.getTime() - 5 * 60 * 60 * 1000);
  return `${local.getUTCFullYear()}-${dos(local.getUTCMonth() + 1)}-${dos(local.getUTCDate())}`;
}

/** Suma días a una fecha AAAA-MM-DD. */
export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return `${d.getUTCFullYear()}-${dos(d.getUTCMonth() + 1)}-${dos(d.getUTCDate())}`;
}
