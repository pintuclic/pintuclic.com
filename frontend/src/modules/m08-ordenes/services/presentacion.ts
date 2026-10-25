import type { BadgeVariant } from '@/core/components';
import { formatCOP } from '@/core/utils/moneda';
import { ESTADOS_FINALIZADOS, ESTADOS_ORDEN, type EstadoOrden, type ModoEntrega } from '../dtos/m08-ordenes.dto';

/** Estados que esperan atención del personal, en el orden del ciclo (los de la bandeja y su contador). */
export const ESTADOS_EN_CURSO: readonly EstadoOrden[] = ESTADOS_ORDEN.filter((e) => !ESTADOS_FINALIZADOS.includes(e));

export const ETIQUETA_ESTADO: Record<EstadoOrden, string> = {
  orden_confirmada: 'Confirmado',
  revision_disponibilidad: 'Revisando disponibilidad',
  en_preparacion: 'En preparación',
  preparada: 'Preparado',
  despachado: 'Enviado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
  devuelto: 'Devuelto',
};

export const ETIQUETA_MODO_ENTREGA: Record<ModoEntrega, string> = {
  domicilio: 'Envío a domicilio',
  recogida: 'Recogida en almacén',
};

/** Color del estado: en curso en azul, cierre normal en verde, cancelado en rojo. */
export function varianteEstado(estado: EstadoOrden): BadgeVariant {
  switch (estado) {
    case 'despachado':
    case 'entregado':
      return 'success';
    case 'cancelado':
      return 'danger';
    case 'devuelto':
      return 'neutral';
    default:
      return 'action';
  }
}

/** `2026-05-12T00:00:00.000Z` → «12 de mayo de 2026». La fecha de la orden es un día, sin hora. */
export function formatearFecha(iso: string): string {
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(iso),
  );
}

/** Momento exacto de un cambio de estado, en hora de Colombia. */
export function formatearFechaHora(iso: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Bogota',
  }).format(new Date(iso));
}

export interface ImportesOrden {
  subTotal: number;
  descuento: number;
  costoEntrega: number;
  baseSinImpuesto: number | null;
  importeIva: number | null;
  tasaIva: number | null;
  total: number;
}

export interface DesgloseTotales {
  /** Filas que llevan al total: subtotal, descuentos y envío. El IVA no es una de ellas. */
  filas: Array<{ etiqueta: string; valor: string }>;
  total: string;
  /** El IVA ya va dentro del total (los precios son con IVA incluido): se muestra aparte, como nota. */
  ivaIncluido: string | null;
}

/**
 * Desglose del importe cobrado. `subTotal` es la suma de los precios con IVA incluido antes de
 * descuentos; por eso el IVA no se presenta como un sumando: subtotal − descuentos + envío = total, y
 * base sin IVA + IVA = total (RF-ORD-02-02).
 */
export function desgloseTotales(importes: ImportesOrden): DesgloseTotales {
  const filas = [{ etiqueta: 'Subtotal', valor: formatCOP(importes.subTotal) }];
  if (importes.descuento > 0) filas.push({ etiqueta: 'Descuentos', valor: `−${formatCOP(importes.descuento)}` });
  if (importes.costoEntrega > 0) filas.push({ etiqueta: 'Envío', valor: formatCOP(importes.costoEntrega) });

  let ivaIncluido: string | null = null;
  if (importes.importeIva !== null) {
    const tasa = importes.tasaIva === null ? '' : ` (${importes.tasaIva} %)`;
    const base = importes.baseSinImpuesto === null ? '' : ` · Base sin IVA: ${formatCOP(importes.baseSinImpuesto)}`;
    ivaIncluido = `Incluye IVA${tasa}: ${formatCOP(importes.importeIva)}${base}`;
  }
  return { filas, total: formatCOP(importes.total), ivaIncluido };
}

/** Cuánto lleva una orden en su estado: «3 d 2 h», «5 h», «12 min» o «menos de 1 min». */
export function formatearDuracion(segundos: number): string {
  const minutos = Math.floor(segundos / 60);
  if (minutos < 1) return 'menos de 1 min';
  const dias = Math.floor(minutos / 1440);
  const horas = Math.floor((minutos % 1440) / 60);
  if (dias > 0) return horas > 0 ? `${dias} d ${horas} h` : `${dias} d`;
  if (horas > 0) return `${horas} h`;
  return `${minutos} min`;
}
