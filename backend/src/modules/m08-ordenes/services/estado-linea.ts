import {
  DISPONIBILIDAD_POR_ESTADO_LINEA,
  type DisponibilidadCliente,
  type EstadoLinea,
  type EstadoOrden,
} from '../dtos/m08-ordenes.dto';
import type { MarcaLinea } from '../interfaces/consulta-cliente.interface';

/** R15: desde el despacho la línea hereda el estado de la orden. */
const HEREDADOS: Readonly<Partial<Record<EstadoOrden, EstadoLinea>>> = {
  despachado: 'despachada',
  entregado: 'entregada',
  cancelado: 'cancelada',
  devuelto: 'devuelta',
};

/**
 * Qué estado tiene una línea con la orden en cada estado y la última marca que tiene (R15 de M08, R17 de M09).
 * Sin marcas, el estado sale de la orden: es el caso de las órdenes que avanzaron antes de que existieran las marcas, y
 * no se les inventa historial.
 */
export function estadoDeLinea(estadoOrden: EstadoOrden, ultimaMarca: MarcaLinea | null): EstadoLinea {
  const heredado = HEREDADOS[estadoOrden];
  if (heredado) return heredado;
  if (estadoOrden === 'orden_confirmada') return 'pendiente';
  if (ultimaMarca) return ultimaMarca;
  if (estadoOrden === 'en_preparacion') return 'disponible';
  if (estadoOrden === 'preparada') return 'preparada';
  return 'pendiente';
}

/** R16: lo que ve el cliente de una línea; null = no se muestra. */
export function disponibilidadParaCliente(estado: EstadoLinea): DisponibilidadCliente | null {
  return DISPONIBILIDAD_POR_ESTADO_LINEA[estado];
}
