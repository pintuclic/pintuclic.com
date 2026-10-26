import type {
  CalendarioEvento,
  MotivoCupon,
  SituacionCupon,
  SituacionEvento,
  TipoExclusion,
  TipoObjetivo,
} from '../dtos/m06-precios.dto';

export const ETIQUETAS_SITUACION_EVENTO: Record<SituacionEvento, string> = {
  programado: 'Programado',
  en_curso: 'En curso',
  en_espera: 'En espera',
  vencido: 'Vencido',
  inactivo: 'Inactivo',
};

export const AYUDA_SITUACION_EVENTO: Record<SituacionEvento, string> = {
  programado: 'Todavía no llega su fecha de inicio.',
  en_curso: 'Está aplicando descuentos ahora mismo.',
  en_espera: 'Está dentro de sus fechas, pero hoy o a esta hora no toca.',
  vencido: 'Ya pasó su fecha de fin.',
  inactivo: 'Está desactivado: no aplica aunque llegue su fecha.',
};

export const ETIQUETAS_SITUACION_CUPON: Record<SituacionCupon, string> = {
  programado: 'Programado',
  vigente: 'Vigente',
  vencido: 'Vencido',
  inactivo: 'Inactivo',
};

export const ETIQUETAS_TIPO_REFERENCIA: Record<TipoExclusion, string> = {
  marca: 'Marca',
  linea: 'Línea',
  categoria: 'Categoría',
  subcategoria: 'Subcategoría',
  producto: 'Producto',
  variante: 'Variante',
  color: 'Color',
  familia_color: 'Familia de color',
};

export const ETIQUETAS_MOTIVO_CUPON: Record<MotivoCupon, string> = {
  cupon_no_valido: 'El código no es válido.',
  cupon_no_vigente: 'El cupón no está vigente.',
  cupon_agotado: 'El cupón ya se agotó.',
  cupon_usado_por_usuario: 'Esta persona ya usó el cupón el máximo de veces.',
  requiere_sesion: 'El cupón exige iniciar sesión.',
  audiencia_no_aplica: 'El cupón no es para este tipo de cliente.',
  monto_minimo_no_alcanzado: 'La compra no alcanza el monto mínimo del cupón.',
  sin_lineas_elegibles: 'Ningún producto del carrito puede recibir el cupón.',
};

export const ETIQUETAS_AUDIENCIA: Record<'todos' | 'particular' | 'empresa', string> = {
  todos: 'Todos los clientes',
  particular: 'Solo particulares',
  empresa: 'Solo cuentas empresa',
};

/** Qué puede descontar una regla (R5). */
export const TIPOS_OBJETIVO: readonly TipoObjetivo[] = [
  'marca',
  'linea',
  'categoria',
  'subcategoria',
  'producto',
  'variante',
];

/** Qué puede excluirse (R6). */
export const TIPOS_EXCLUSION: readonly TipoExclusion[] = [...TIPOS_OBJETIVO, 'color', 'familia_color'];

/** Días ISO: 1 = lunes … 7 = domingo. */
export const DIAS_SEMANA: ReadonlyArray<{ valor: number; corto: string; largo: string; plural: string }> = [
  { valor: 1, corto: 'Lun', largo: 'Lunes', plural: 'lunes' },
  { valor: 2, corto: 'Mar', largo: 'Martes', plural: 'martes' },
  { valor: 3, corto: 'Mié', largo: 'Miércoles', plural: 'miércoles' },
  { valor: 4, corto: 'Jue', largo: 'Jueves', plural: 'jueves' },
  { valor: 5, corto: 'Vie', largo: 'Viernes', plural: 'viernes' },
  { valor: 6, corto: 'Sáb', largo: 'Sábado', plural: 'sábados' },
  { valor: 7, corto: 'Dom', largo: 'Domingo', plural: 'domingos' },
];

/** "Todos los días", "Los miércoles", "Los lunes, miércoles y viernes". */
export function resumenDias(dias: readonly number[]): string {
  const ordenados = [...new Set(dias)].sort((a, b) => a - b);
  if (ordenados.length === 0 || ordenados.length === 7) return 'Todos los días';
  const nombres = ordenados.map((d) => DIAS_SEMANA.find((x) => x.valor === d)?.plural ?? String(d));
  if (nombres.length === 1) return `Los ${nombres[0]}`;
  return `Los ${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}

/** AAAA-MM-DD → DD/MM/AAAA, sin pasar por `Date` (la fecha es de calendario, no un instante). */
export function formatearFechaCalendario(fecha: string): string {
  const [a, m, d] = fecha.split('-');
  return a !== undefined && m !== undefined && d !== undefined ? `${d}/${m}/${a}` : fecha;
}

/** "Los miércoles · 08:00 a 20:00 · desde el 04/11/2026". */
export function resumenCalendario(c: CalendarioEvento): string {
  const horas = c.horaInicio !== null && c.horaFin !== null ? `${c.horaInicio} a ${c.horaFin}` : 'Todo el día';
  let rango: string;
  if (c.fechaFin === null) rango = `desde el ${formatearFechaCalendario(c.fechaInicio)}`;
  else if (c.fechaFin === c.fechaInicio) rango = `el ${formatearFechaCalendario(c.fechaInicio)}`;
  else rango = `del ${formatearFechaCalendario(c.fechaInicio)} al ${formatearFechaCalendario(c.fechaFin)}`;
  return `${resumenDias(c.diasSemana)} · ${horas} · ${rango}`;
}

const PESOS_ENTEROS = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const PESOS_CON_CENTAVOS = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const NUMERO = new Intl.NumberFormat('es-CO');

/** $ 85.900 si es exacto; $ 124.125,50 si tiene centavos (nunca "124.125,5"). */
export const formatearPesos = (valor: number): string =>
  Number.isInteger(valor) ? PESOS_ENTEROS.format(valor) : PESOS_CON_CENTAVOS.format(valor);
export const formatearNumero = (valor: number): string => NUMERO.format(valor);

/** 15 → "15 %"; 12,5 → "12,5 %". */
export function formatearPorcentaje(valor: number): string {
  return `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(valor)} %`;
}

/** Instante ISO → "04/11/2026, 10:00" en hora de Colombia, sea cual sea el huso del navegador. */
export function formatearFechaHora(iso: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    dateStyle: 'short',
    timeStyle: 'short',
    hour12: false,
  }).format(new Date(iso));
}

const DESFASE_BOGOTA_HORAS = 5;

/** Valor de un `datetime-local` (hora de Colombia) → instante ISO UTC. Colombia no cambia de horario. */
export function aInstanteBogota(local: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (m === null) return null;
  const [, a, mes, d, h, min] = m;
  const t = Date.UTC(Number(a), Number(mes) - 1, Number(d), Number(h) + DESFASE_BOGOTA_HORAS, Number(min));
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

/** Instante ISO UTC → valor para un `datetime-local` en hora de Colombia. */
export function deInstanteBogota(iso: string): string {
  const t = new Date(new Date(iso).getTime() - DESFASE_BOGOTA_HORAS * 3_600_000);
  return t.toISOString().slice(0, 16);
}

/** Fecha de hoy en Colombia (AAAA-MM-DD), sea cual sea el huso del navegador. */
export function hoyBogota(ahora: Date = new Date()): string {
  return new Date(ahora.getTime() - DESFASE_BOGOTA_HORAS * 3_600_000).toISOString().slice(0, 10);
}
