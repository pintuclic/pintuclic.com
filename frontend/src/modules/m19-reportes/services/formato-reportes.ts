import { formatCOP } from '@/core/utils/moneda';
import type { Agrupacion } from '../dtos/m19-reportes.dto';

export const pesos = (n: number): string => formatCOP(n);
export const entero = (n: number): string => new Intl.NumberFormat('es-CO').format(n);
export const decimal = (n: number): string => new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(n);

/** «+12,5 %» / «−3 %» / «—» (sin periodo anterior con qué comparar). */
export function textoVariacion(v: number | null): string {
  if (v === null) return '—';
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${decimal(Math.abs(v))} %`;
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** «26 oct 2026» a partir de AAAA-MM-DD, sin pasar por zonas horarias. */
export function fechaCorta(iso: string): string {
  const [a, m, d] = iso.split('-');
  return `${String(Number(d))} ${MESES[Number(m) - 1] ?? ''} ${a ?? ''}`;
}

/** El nombre del intervalo de una barra: el día, «Sem. 26 oct», «oct 2026» o «2026». */
export function etiquetaIntervalo(iso: string, agrupar: Agrupacion): string {
  const [a, m, d] = iso.split('-');
  switch (agrupar) {
    case 'dia':
      return `${String(Number(d))} ${MESES[Number(m) - 1] ?? ''}`;
    case 'semana':
      return `Sem. ${String(Number(d))} ${MESES[Number(m) - 1] ?? ''}`;
    case 'mes':
      return `${MESES[Number(m) - 1] ?? ''} ${a ?? ''}`;
    case 'anio':
      return a ?? '';
  }
}

export const ETIQUETA_AGRUPACION: Record<Agrupacion, string> = { dia: 'Por día', semana: 'Por semana', mes: 'Por mes', anio: 'Por año' };

export const ETIQUETA_ESTADO: Record<string, string> = {
  orden_confirmada: 'Confirmadas',
  revision_disponibilidad: 'Revisando disponibilidad',
  en_preparacion: 'En alistamiento',
  preparada: 'Alistadas',
  despachado: 'Despachadas',
  entregado: 'Entregadas',
  cancelado: 'Canceladas',
  devuelto: 'Devueltas',
};
