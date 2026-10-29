import type { BadgeVariant } from '@/core/components';
import type { EstadoLinea, EstadoMarca, EstadoOrden, VerificacionOrden } from '../dtos/m09-cumplimiento.dto';

export const ETIQUETA_ESTADO_LINEA: Record<EstadoLinea, string> = {
  pendiente: 'Sin revisar',
  disponible: 'Disponible',
  consiguiendo_stock: 'Consiguiendo stock',
  no_disponible: 'No disponible',
};

/** Lo que el empleado puede marcar, en el orden en que se muestra. */
export const MARCAS: ReadonlyArray<{ valor: EstadoMarca; etiqueta: string }> = [
  { valor: 'disponible', etiqueta: 'Disponible' },
  { valor: 'consiguiendo_stock', etiqueta: 'Consiguiendo stock' },
  { valor: 'no_disponible', etiqueta: 'No disponible' },
];

export function varianteLinea(estado: EstadoLinea): BadgeVariant {
  switch (estado) {
    case 'disponible':
      return 'success';
    case 'consiguiendo_stock':
      return 'sponsored';
    case 'no_disponible':
      return 'danger';
    default:
      return 'neutral';
  }
}

/** «2 de 3 productos disponibles». */
export function resumenAvance(v: Pick<VerificacionOrden, 'lineas' | 'lineasSinConfirmar'>): string {
  const total = v.lineas.length;
  const listas = total - v.lineasSinConfirmar;
  return `${listas} de ${total} ${total === 1 ? 'producto disponible' : 'productos disponibles'}`;
}

export const AVISO_PASO_AUTOMATICO = 'Cuando todos los productos estén disponibles, el pedido pasa solo a preparación.';
export const AVISO_AVANZO = 'Todos los productos están disponibles: el pedido pasó a preparación.';

/** Qué se le dice al empleado según dónde está el pedido; en preparación o preparado, corregir no lo devuelve (R6). */
export function avisoDelEstado(estado: EstadoOrden): string {
  return estado === 'revision_disponibilidad'
    ? AVISO_PASO_AUTOMATICO
    : 'El pedido ya salió de la revisión. Si corrige una marca, el pedido no vuelve atrás.';
}
