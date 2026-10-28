import type { Carrito, LineaCarrito } from '../../m05-carrito/dtos/m05-carrito.dto';
import type { SolicitudPagadaInput } from '../../m08-ordenes/dtos/m08-ordenes.dto';
import {
  REINTENTOS_ORDEN_MINUTOS,
  type DireccionEntrega,
  type EstadoWompi,
  type IntentoPago,
  type ModoEntrega,
  type OrigenSolicitud,
  type Solicitud,
} from '../dtos/m07-checkout.dto';
import type { LineaCongelada, SolicitudGuardada } from '../interfaces/checkout.interface';

const ZONA_COLOMBIA = 'America/Bogota';
const MS_POR_MINUTO = 60_000;

/** Pesos con dos decimales, sin errores de coma flotante al sumar. */
export function redondear2(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/** R10: lo que va a Wompi. */
export function aCentavos(valor: number): number {
  return Math.round(valor * 100);
}

export function anioColombia(fecha: Date): number {
  return Number(new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_COLOMBIA, year: 'numeric' }).format(fecha));
}

/** `SOL-2026-00001`: el mismo formato que el código de la orden (R4 de M08). */
export function formatearCodigo(anio: number, numero: number): string {
  return `SOL-${anio}-${String(numero).padStart(5, '0')}`;
}

/** R11: Wompi exige una referencia única por transacción. */
export function referenciaIntento(codigo: string, numero: number): string {
  return `${codigo}-${numero}`;
}

/** R10: recogida gratis; domicilio con la tarifa base, gratis desde el umbral. */
export function costoEnvio(modo: ModoEntrega, totalMercancia: number, costoBase: number, umbralGratis: number): number {
  if (modo === 'recogida') return 0;
  return aCentavos(totalMercancia) >= aCentavos(umbralGratis) ? 0 : costoBase;
}

/** R12: `*** *** 1111`. */
export function enmascararCelular(celular: string): string {
  return `*** *** ${celular.slice(-4)}`;
}

/** R12: el teléfono del perfil sirve de sugerencia solo si ya tiene el formato de Nequi. */
export function celularNequiDe(telefono: string | null | undefined): string | null {
  const limpio = (telefono ?? '').replace(/[\s()+-]/g, '').replace(/^57(?=3\d{9}$)/, '');
  return /^3\d{9}$/.test(limpio) ? limpio : null;
}

/** R14: la dirección como queda en la solicitud y en la orden. */
export function textoDireccion(d: DireccionEntrega): string {
  const partes = [d.direccion, d.barrio, d.apartamentoCasa].filter((p): p is string => p !== null && p.trim() !== '');
  return `${partes.join(', ')} · Recibe: ${d.nombreRecibe}, ${d.telefonoRecibe}`;
}

/** R9: el origen sale de las líneas de cotización; más de una cotización no se puede pagar junta. */
export function origenDeLineas(
  lineas: readonly Pick<LineaCarrito, 'idCotizacion'>[],
): { origen: OrigenSolicitud; idCotizacion: number | null } | 'varias' {
  const cotizaciones = new Set(lineas.map((l) => l.idCotizacion).filter((id): id is number => id !== null));
  if (cotizaciones.size > 1) return 'varias';
  const [idCotizacion] = [...cotizaciones];
  return idCotizacion === undefined ? { origen: 'carrito', idCotizacion: null } : { origen: 'cotizacion', idCotizacion };
}

/**
 * R2 d: congela cada línea del carrito revalidado con su precio de M06. Solo se llama con un carrito que M05
 * dio por bueno (`puedeContinuar`): todas las líneas son vendibles y tienen precio.
 */
export function congelarLineas(carrito: Carrito): LineaCongelada[] {
  return carrito.lineas.map((linea, posicion) => {
    const precio = linea.precio;
    if (precio === null || !precio.vendible) {
      throw new Error(`La línea ${linea.idLinea} no tiene precio: el carrito no debió darse por bueno.`);
    }
    return {
      posicion,
      idVariante: linea.idVariante,
      idColor: linea.idColor,
      idCotizacion: linea.idCotizacion,
      nombreProducto: linea.producto.nombre ?? 'Producto',
      marca: linea.producto.marca,
      medida: linea.producto.medida,
      sku: linea.producto.sku,
      colorNombre: linea.producto.color?.nombre ?? null,
      colorHexadecimal: linea.producto.color?.hexadecimal ?? null,
      cantidad: linea.cantidad,
      precioInicial: precio.precioInicial ?? 0,
      precioAplicado: precio.precioUnitarioFinal ?? 0,
      subtotal: precio.subtotal ?? 0,
      descuentos: precio.descuentos.map((d) => ({
        ordenAplicacion: d.ordenAplicacion,
        origen: d.origen,
        porcentaje: d.porcentaje,
        importe: d.importe,
      })),
    };
  });
}

/** Texto para el cliente de un intento que no se aprobó. */
export function mensajeIntento(estado: EstadoWompi): string | null {
  switch (estado) {
    case 'DECLINED':
      return 'Nequi no aprobó el pago, o no lo aceptaste a tiempo en la app.';
    case 'ERROR':
      return 'No se pudo completar el pago con Nequi. Revisa que el número tenga Nequi e inténtalo de nuevo.';
    case 'VOIDED':
      return 'El pago fue anulado.';
    default:
      return null;
  }
}

/** R6: cuándo reintentar la orden tras el fallo número `reintentos` (1, 2…); null si ya no quedan. */
export function proximoReintento(reintentos: number, ahora: Date): Date | null {
  const minutos = REINTENTOS_ORDEN_MINUTOS[reintentos - 1];
  return minutos === undefined ? null : new Date(ahora.getTime() + minutos * MS_POR_MINUTO);
}

/** R3: vence si pasó su plazo y no tiene un pago en curso. */
export function debeVencer(s: Pick<SolicitudGuardada, 'estado' | 'venceEn' | 'intentos'>, ahora: Date): boolean {
  if (s.estado !== 'en_pago' && s.estado !== 'rechazada') return false;
  if (s.venceEn.getTime() > ahora.getTime()) return false;
  const ultimo = s.intentos.at(-1);
  return !(s.estado === 'en_pago' && ultimo?.estado === 'PENDING');
}

/** Contrato de M08 (§2), con el mapeo de la sección 5 del contrato de M07. */
export function solicitudPagada(s: SolicitudGuardada): SolicitudPagadaInput {
  if (s.transaccionPagoId === null || s.montoPagado === null) {
    throw new Error(`La solicitud ${s.codigo} no tiene un pago aprobado.`);
  }
  return {
    codigoSolicitud: s.codigo,
    transaccionPagoId: s.transaccionPagoId,
    idUsuario: s.idUsuario,
    origen: s.origen,
    idCotizacion: s.idCotizacion,
    modoEntrega: s.modoEntrega,
    direccion: s.direccion,
    costoEntrega: s.costoEntrega,
    subTotal: s.subTotal,
    descuento: s.descuento,
    total: s.total,
    baseSinImpuesto: s.baseSinImpuesto,
    importeIva: s.importeIva,
    tasaIva: s.tasaIva,
    montoPagado: s.montoPagado,
    observaciones: s.observaciones,
    lineas: s.lineas.map((l) => ({
      nombreProducto: l.nombreProducto,
      varianteCopia: l.medida ?? l.sku ?? l.nombreProducto,
      colorSolicitado: l.colorNombre,
      skuVendido: l.sku,
      cantidad: l.cantidad,
      precioInicial: l.precioInicial,
      precioAplicado: l.precioAplicado,
      idVarianteRef: l.idVariante,
      // D8: hasta que M01 lo exponga (P5).
      esEntonado: false,
      baseConsumida: null,
      descuentos: l.descuentos,
    })),
  };
}

function aIntentoPago(i: SolicitudGuardada['intentos'][number]): IntentoPago {
  return {
    numero: i.numero,
    estadoWompi: i.estado,
    celularEnmascarado: i.celularEnmascarado,
    motivo: i.mensaje,
    fecha: i.fechaCreacion.toISOString(),
  };
}

/** La solicitud como la ve el cliente. */
export function aSolicitud(s: SolicitudGuardada): Solicitud {
  return {
    codigo: s.codigo,
    estado: s.estado,
    origen: s.origen,
    modoEntrega: s.modoEntrega,
    direccion: s.direccion,
    lineas: s.lineas.map((l) => ({
      nombreProducto: l.nombreProducto,
      marca: l.marca,
      medida: l.medida,
      color: l.colorNombre === null ? null : { nombre: l.colorNombre, hexadecimal: l.colorHexadecimal ?? '#FFFFFF' },
      cantidad: l.cantidad,
      subtotal: l.subtotal,
      idCotizacion: l.idCotizacion,
    })),
    resumen: {
      subtotalInicial: s.subTotal,
      descuentoEventos: s.descuentoEventos,
      descuentoEmpresa: s.descuentoEmpresa,
      descuentoCupon: s.importeCupon,
      descuentoTotal: s.descuento,
      total: s.totalMercancia,
      tasaIva: s.tasaIva,
      baseSinImpuesto: s.baseSinImpuesto,
      importeIva: s.importeIva,
    },
    costoEnvio: s.costoEntrega,
    totalACobrar: s.total,
    intentos: s.intentos.map(aIntentoPago),
    venceEn: s.venceEn.toISOString(),
    codigoOrden: s.codigoOrden,
    creadaEn: s.fechaCreacion.toISOString(),
  };
}
