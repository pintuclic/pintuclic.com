import {
  ESTADOS_CUMPLIMIENTO,
  type EstadoCumplimiento,
  type EstadoLinea,
  type EstadoOrden,
  type HojaPreparacion,
  type LineaVerificacion,
  type MotivoRetencion,
  type VerificacionOrden,
} from '../dtos/m09-cumplimiento.dto';
import type { LineaDatos, OrdenDatos } from '../interfaces/cumplimiento.interface';

/** R4. */
export function esEstadoDeCumplimiento(estado: EstadoOrden): estado is EstadoCumplimiento {
  return (ESTADOS_CUMPLIMIENTO as readonly string[]).includes(estado);
}

/** R2 y R3: el estado de una línea es su último registro; sin registros, pendiente. */
export function estadoDeLinea(linea: Pick<LineaDatos, 'registros'>): EstadoLinea {
  return linea.registros[linea.registros.length - 1]?.estado ?? 'pendiente';
}

/** R7. Una orden sin líneas nunca está completa. */
export function todasDisponibles(lineas: readonly Pick<LineaDatos, 'registros'>[]): boolean {
  return lineas.length > 0 && lineas.every((l) => estadoDeLinea(l) === 'disponible');
}

/** Producto y presentación, como se nombra una línea en la lista de retenidas. */
export function describirLinea(linea: Pick<LineaDatos, 'nombreProducto' | 'varianteCopia'>): string {
  return `${linea.nombreProducto} — ${linea.varianteCopia}`;
}

/** R12. Una entrada por cada línea que no está disponible. */
export function motivosDeRetencion(lineas: readonly LineaDatos[]): MotivoRetencion[] {
  return lineas.flatMap((linea) => {
    const estado = estadoDeLinea(linea);
    return estado === 'disponible' ? [] : [{ descripcion: describirLinea(linea), estado }];
  });
}

function aLineaVerificacion(linea: LineaDatos): LineaVerificacion {
  return {
    numeroLinea: linea.numeroLinea,
    nombreProducto: linea.nombreProducto,
    varianteCopia: linea.varianteCopia,
    colorSolicitado: linea.colorSolicitado,
    cantidad: linea.cantidad,
    esEntonado: linea.esEntonado,
    baseConsumida: linea.esEntonado ? linea.baseConsumida : null,
    estado: estadoDeLinea(linea),
    historial: linea.registros.map((r) => ({ estado: r.estado, autor: r.autor, fecha: r.fecha.toISOString() })),
  };
}

export function armarVerificacion(orden: OrdenDatos, estado: EstadoCumplimiento): VerificacionOrden {
  const sinConfirmar = orden.lineas.filter((l) => estadoDeLinea(l) !== 'disponible').length;
  return {
    codigo: orden.codigo,
    estado,
    lineasSinConfirmar: sinConfirmar,
    completa: todasDisponibles(orden.lineas),
    lineas: orden.lineas.map(aLineaVerificacion),
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
