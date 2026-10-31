import { estadoDeLinea as estadoDeLineaDeOrden } from '../../m08-ordenes/services/estado-linea';
import {
  ESTADOS_CUMPLIMIENTO,
  MAX_NOTA_CANCELACION,
  type EstadoCumplimiento,
  type EstadoLinea,
  type EstadoOrden,
  type HojaPreparacion,
  type LineaVerificacion,
  type MotivoRetencion,
  type TramiteCancelacion,
  type VerificacionOrden,
} from '../dtos/m09-cumplimiento.dto';
import type { LineaDatos, OrdenDatos } from '../interfaces/cumplimiento.interface';

/** R4. */
export function esEstadoDeCumplimiento(estado: EstadoOrden): estado is EstadoCumplimiento {
  return (ESTADOS_CUMPLIMIENTO as readonly string[]).includes(estado);
}

/** R17: el estado de una línea sale de su última marca y del estado de la orden (misma función que usa M08). */
export function estadoDeLinea(estadoOrden: EstadoOrden, linea: Pick<LineaDatos, 'registros'>): EstadoLinea {
  return estadoDeLineaDeOrden(estadoOrden, linea.registros[linea.registros.length - 1]?.estado ?? null);
}

/** R7. Una orden sin líneas nunca está completa. */
export function todasDisponibles(estadoOrden: EstadoOrden, lineas: readonly Pick<LineaDatos, 'registros'>[]): boolean {
  return lineas.length > 0 && lineas.every((l) => estadoDeLinea(estadoOrden, l) === 'disponible');
}

/** R15. Una orden sin líneas nunca está preparada. */
export function todasPreparadas(estadoOrden: EstadoOrden, lineas: readonly Pick<LineaDatos, 'registros'>[]): boolean {
  return lineas.length > 0 && lineas.every((l) => estadoDeLinea(estadoOrden, l) === 'preparada');
}

type EstadoSinConfirmar = MotivoRetencion['estado'];

/** Las líneas que aún no están confirmadas: pendientes, consiguiendo stock o no disponibles. */
function esSinConfirmar(estado: EstadoLinea): estado is EstadoSinConfirmar {
  return estado === 'pendiente' || estado === 'consiguiendo_stock' || estado === 'no_disponible';
}

/** Producto y presentación, como se nombra una línea en la lista de retenidas. */
export function describirLinea(linea: Pick<LineaDatos, 'nombreProducto' | 'varianteCopia'>): string {
  return `${linea.nombreProducto} — ${linea.varianteCopia}`;
}

/** R12. Una entrada por cada línea que no está disponible; solo se piden para órdenes en revisión. */
export function motivosDeRetencion(estadoOrden: EstadoOrden, lineas: readonly LineaDatos[]): MotivoRetencion[] {
  return lineas.flatMap((linea) => {
    const estado = estadoDeLinea(estadoOrden, linea);
    return esSinConfirmar(estado) ? [{ descripcion: describirLinea(linea), estado }] : [];
  });
}

function aLineaVerificacion(estadoOrden: EstadoOrden, linea: LineaDatos): LineaVerificacion {
  return {
    numeroLinea: linea.numeroLinea,
    nombreProducto: linea.nombreProducto,
    varianteCopia: linea.varianteCopia,
    colorSolicitado: linea.colorSolicitado,
    cantidad: linea.cantidad,
    esEntonado: linea.esEntonado,
    baseConsumida: linea.esEntonado ? linea.baseConsumida : null,
    estado: estadoDeLinea(estadoOrden, linea),
    historial: linea.registros.map((r) => ({ estado: r.estado, autor: r.autor, fecha: r.fecha.toISOString() })),
  };
}

function aTramite(orden: OrdenDatos): TramiteCancelacion | null {
  const c = orden.cancelacion;
  return c === null ? null : { codigo: c.codigo, estado: c.estado, iniciadaPor: c.iniciadaPor, fecha: c.fecha.toISOString() };
}

/** R4: la verificación se consulta en cualquier estado de la orden. */
export function armarVerificacion(orden: OrdenDatos): VerificacionOrden {
  const sinConfirmar = orden.lineas.filter((l) => esSinConfirmar(estadoDeLinea(orden.estado, l))).length;
  return {
    codigo: orden.codigo,
    estado: orden.estado,
    lineasSinConfirmar: sinConfirmar,
    completa: orden.lineas.length > 0 && sinConfirmar === 0,
    lineas: orden.lineas.map((l) => aLineaVerificacion(orden.estado, l)),
    cancelacion: aTramite(orden),
  };
}

/** R13. Solo lo que la bodega necesita: nada de importes, descuentos, pago ni datos del cliente. */
export function armarHoja(orden: OrdenDatos, estado: EstadoCumplimiento, generadaEn: Date): HojaPreparacion {
  return {
    codigo: orden.codigo,
    generadaEn: generadaEn.toISOString(),
    estado,
    lineas: orden.lineas.map((l) => ({
      numeroLinea: l.numeroLinea,
      nombreProducto: l.nombreProducto,
      varianteCopia: l.varianteCopia,
      colorSolicitado: l.colorSolicitado,
      cantidad: l.cantidad,
      baseConsumida: l.esEntonado ? l.baseConsumida : null,
    })),
  };
}

/**
 * R18. El motivo que recibe M11 y que el cliente leerá en el correo: los productos sin stock y, si hay, la nota del empleado.
 * La nota se recorta al tope del contrato por si llegara más larga.
 */
export function componerMotivoCancelacion(sinStock: readonly LineaDatos[], nota: string | undefined): string {
  const productos = sinStock
    .map((l) => `${l.nombreProducto}, ${l.varianteCopia} (${l.cantidad} ${l.cantidad === 1 ? 'unidad' : 'unidades'})`)
    .join('; ');
  const base = `Sin existencias de: ${productos}.`;
  const limpia = nota?.trim().slice(0, MAX_NOTA_CANCELACION);
  return limpia ? `${base}\nNota: ${limpia}` : base;
}
