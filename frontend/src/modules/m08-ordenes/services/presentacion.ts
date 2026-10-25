import type { BadgeVariant } from '@/core/components';
import type { EstadoOrden, ModoEntrega } from '../dtos/m08-ordenes.dto';

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
