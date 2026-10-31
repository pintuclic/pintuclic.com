import { ETIQUETA_ESTADO, ETIQUETA_ESTADO_LINEA, varianteEstadoLinea } from '@/modules/m08-ordenes/services/presentacion';
import {
  MAX_NOTA_CANCELACION,
  type EstadoLinea,
  type EstadoMarca,
  type EstadoOrden,
  type LineaVerificacion,
  type VerificacionOrden,
} from '../dtos/m09-cumplimiento.dto';

/** El estado de cada producto se rotula igual en todo el panel: la fuente es la presentación de M08. */
export { ETIQUETA_ESTADO_LINEA };
export const varianteLinea = varianteEstadoLinea;

/** Todas las marcas que existen, con su texto (R2 de M09). */
export const MARCAS: ReadonlyArray<{ valor: EstadoMarca; etiqueta: string }> = [
  { valor: 'disponible', etiqueta: 'Disponible' },
  { valor: 'consiguiendo_stock', etiqueta: 'Consiguiendo stock' },
  { valor: 'no_disponible', etiqueta: 'No disponible' },
  { valor: 'preparada', etiqueta: 'Preparada' },
];

const SIN_PREPARADA = MARCAS.filter((m) => m.valor !== 'preparada');
const SOLO_AVANCE = MARCAS.filter((m) => m.valor === 'disponible' || m.valor === 'preparada');

/**
 * Las opciones que se le ofrecen al empleado en una línea, en el orden en que se muestran:
 * - En revisión, las tres de disponibilidad (preparar antes de confirmar no tiene sentido, R15).
 * - Ya en preparación, solo «Disponible» y «Preparada»: es lo que se hace a diario. Si alguna línea tiene un problema
 *   (consiguiendo stock o no disponible) se ofrecen todas, para poder corregirla.
 */
export function marcasDisponibles(estadoOrden: EstadoOrden, estadoLinea: EstadoLinea): ReadonlyArray<{ valor: EstadoMarca; etiqueta: string }> {
  if (estadoOrden === 'revision_disponibilidad') return SIN_PREPARADA;
  return estadoLinea === 'consiguiendo_stock' || estadoLinea === 'no_disponible' ? MARCAS : SOLO_AVANCE;
}

const EN_PREPARACION = (estado: EstadoOrden): boolean => estado === 'en_preparacion' || estado === 'preparada';

/** «2 de 3 productos disponibles» en revisión; «2 de 3 productos preparados» una vez en preparación. */
export function resumenAvance(v: Pick<VerificacionOrden, 'estado' | 'lineas' | 'lineasSinConfirmar'>): string {
  const total = v.lineas.length;
  if (EN_PREPARACION(v.estado)) {
    const preparadas = v.lineas.filter((l) => l.estado === 'preparada').length;
    return `${preparadas} de ${total} ${total === 1 ? 'producto preparado' : 'productos preparados'}`;
  }
  const listas = total - v.lineasSinConfirmar;
  return `${listas} de ${total} ${total === 1 ? 'producto disponible' : 'productos disponibles'}`;
}

export const AVISO_PASO_AUTOMATICO = 'Cuando todos los productos estén disponibles, el pedido pasa solo a preparación.';
export const AVISO_PASO_A_PREPARADA = `Cuando todos los productos estén preparados, el pedido pasa solo a «${ETIQUETA_ESTADO.preparada}».`;
export const AVISO_AVANZO = 'Todos los productos están disponibles: el pedido pasó a preparación.';
export const AVISO_AVANZO_PREPARADA = `Todos los productos están preparados: el pedido pasó a «${ETIQUETA_ESTADO.preparada}».`;

/** Qué se le dice al empleado según dónde está el pedido; ya preparado, corregir no lo devuelve (R6). */
export function avisoDelEstado(estado: EstadoOrden): string {
  if (estado === 'revision_disponibilidad') return AVISO_PASO_AUTOMATICO;
  if (estado === 'en_preparacion') return `${AVISO_PASO_A_PREPARADA} Si corrige una marca, el pedido no vuelve atrás.`;
  return 'El pedido ya salió de la preparación. Si corrige una marca, el pedido no vuelve atrás.';
}

/** Qué se avisa cuando una marca movió el pedido (R7 y R15). */
export function avisoDeAvance(estado: EstadoOrden): string {
  return estado === 'preparada' ? AVISO_AVANZO_PREPARADA : AVISO_AVANZO;
}

/** Lo que hay que resolver con el cliente: productos que se están consiguiendo o que no hay (R19). */
export function hayProductosConProblema(lineas: readonly Pick<LineaVerificacion, 'estado'>[]): boolean {
  return lineas.some((l) => l.estado === 'consiguiendo_stock' || l.estado === 'no_disponible');
}

/** Solo con un producto que no hay se puede pedir la cancelación del pedido (R18). */
export function hayProductosSinStock(lineas: readonly Pick<LineaVerificacion, 'estado'>[]): boolean {
  return lineas.some((l) => l.estado === 'no_disponible');
}

/** R18: el pedido se puede cancelar mientras está en revisión o en preparación (los estados cancelables de M11). */
export function puedePedirCancelacion(v: Pick<VerificacionOrden, 'estado' | 'lineas' | 'cancelacion'>): boolean {
  return (
    v.cancelacion === null &&
    (v.estado === 'revision_disponibilidad' || v.estado === 'en_preparacion') &&
    hayProductosSinStock(v.lineas)
  );
}

/**
 * R18: el motivo tal como lo arma el servidor y como lo leerá el cliente en el correo. Se repite aquí solo para mostrarlo
 * antes de confirmar; lo que cuenta es lo que arma el servidor.
 */
export function motivoDeCancelacion(lineas: readonly LineaVerificacion[], nota: string): string {
  const productos = lineas
    .filter((l) => l.estado === 'no_disponible')
    .map((l) => `${l.nombreProducto}, ${l.varianteCopia} (${l.cantidad} ${l.cantidad === 1 ? 'unidad' : 'unidades'})`)
    .join('; ');
  const base = `Sin existencias de: ${productos}.`;
  const limpia = nota.trim().slice(0, MAX_NOTA_CANCELACION);
  return limpia ? `${base}\nNota: ${limpia}` : base;
}
