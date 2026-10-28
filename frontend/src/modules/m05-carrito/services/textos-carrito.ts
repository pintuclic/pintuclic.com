import type { AvisoCalculo, MotivoCupon, MotivoNoVendible } from '@/modules/m06-precios/dtos/m06-precios.dto';
import { formatCOP } from '@/core/utils/moneda';
import type { CambioRevalidacion, Carrito, LineaCarrito, UnionCarrito } from '../dtos/m05-carrito.dto';

/** Textos de la pantalla del carrito, en palabras del cliente (sin códigos internos). */

const MOTIVOS_NO_VENDIBLE: Record<MotivoNoVendible, string> = {
  variante_no_existe: 'Este producto ya no está en la tienda.',
  variante_inactiva: 'Esta presentación ya no está a la venta.',
  producto_no_disponible: 'Este producto no está disponible en este momento.',
  color_no_ofrecido: 'Este color ya no se ofrece para este producto.',
  combo_agotado: 'Este combo se agotó.',
};

export function textoNoVendible(motivo: MotivoNoVendible | null): string {
  return motivo === null ? MOTIVOS_NO_VENDIBLE.producto_no_disponible : MOTIVOS_NO_VENDIBLE[motivo];
}

export function textoCupon(motivo: MotivoCupon, montoMinimo: number | null): string {
  switch (motivo) {
    case 'cupon_no_valido':
      return 'Este código no es válido. Revisa que esté bien escrito.';
    case 'cupon_no_vigente':
      return 'Este código no está vigente.';
    case 'cupon_agotado':
      return 'Este código ya no tiene usos disponibles.';
    case 'cupon_usado_por_usuario':
      return 'Ya usaste este código las veces permitidas.';
    case 'requiere_sesion':
      return 'Inicia sesión para usar este código.';
    case 'audiencia_no_aplica':
      return 'Este código no aplica para tu tipo de cuenta.';
    case 'monto_minimo_no_alcanzado':
      return montoMinimo === null
        ? 'Tu compra aún no alcanza el mínimo de este código.'
        : `Este código aplica en compras desde ${formatCOP(montoMinimo)}.`;
    case 'sin_lineas_elegibles':
      return 'Ningún producto de tu carrito recibe este descuento.';
  }
}

/** Guía M06 §3: "Te faltan $X para recibir tu 15 % de descuento Proveedor". */
export function textoAviso(aviso: AvisoCalculo): string {
  if (aviso.tipo === 'empresa_falta_monto') {
    return `Te faltan ${formatCOP(aviso.faltante)} para recibir tu ${aviso.porcentaje} % de descuento ${aviso.tipoCliente}.`;
  }
  return '¿Compras para tu empresa? Solicita una cuenta empresa y accede a descuentos especiales.';
}

/** C9: qué pasó con el carrito que tenía el cliente antes de iniciar sesión. */
export function textoUnion(union: UnionCarrito): string | null {
  const movidas = union.lineasAgregadas + union.lineasSumadas;
  if (movidas === 0 && union.lineasDescartadas === 0) return null;
  const partes = ['Agregamos a tu cuenta los productos que tenías en el carrito.'];
  if (union.cantidadesAjustadas > 0) partes.push('Algunas cantidades quedaron en el máximo permitido.');
  if (union.lineasDescartadas > 0) {
    partes.push(
      `${union.lineasDescartadas} ${union.lineasDescartadas === 1 ? 'producto no cupo' : 'productos no cupieron'} porque el carrito está lleno.`,
    );
  }
  return partes.join(' ');
}

function nombreDe(lineas: readonly LineaCarrito[], idLinea: number): string {
  return lineas.find((l) => l.idLinea === idLinea)?.producto.nombre ?? 'Un producto';
}

/** C11: un cambio que encontró la revalidación, en una frase. */
export function textoCambio(cambio: CambioRevalidacion, carrito: Carrito): string {
  switch (cambio.tipo) {
    case 'precio_cambio':
      return `${nombreDe(carrito.lineas, cambio.idLinea)} cambió de ${formatCOP(cambio.subtotalAnterior)} a ${formatCOP(cambio.subtotalNuevo)}.`;
    case 'linea_no_vendible': {
      const nombre = nombreDe(carrito.lineas, cambio.idLinea);
      return `${nombre}: ${textoNoVendible(cambio.motivo)} Quítalo para continuar.`;
    }
    case 'linea_quitada':
      return 'Un producto que veías ya no está en tu carrito.';
    case 'linea_nueva':
      return `Se agregó ${nombreDe(carrito.lineas, cambio.idLinea)} desde otra ventana.`;
    case 'cupon_no_aplica':
      return `El código ${cambio.codigo} no se aplicó: ${textoCupon(cambio.motivo, null)}`;
    case 'total_cambio':
      return `El total cambió de ${formatCOP(cambio.totalAnterior)} a ${formatCOP(cambio.totalNuevo)}.`;
  }
}

/** Qué hacer después de una revalidación con cambios: un código rechazado no se arregla volviendo a pulsar. */
export function textoSiguientePaso(cambios: readonly CambioRevalidacion[]): string {
  return cambios.some((c) => c.tipo === 'cupon_no_aplica')
    ? 'Quita el código de descuento o escribe otro, y vuelve a pulsar «Continuar con la compra».'
    : 'Revisa tu carrito y vuelve a pulsar «Continuar con la compra».';
}

/** Referencia para el botón de WhatsApp de M15. */
export function referenciaWhatsapp(cantidadItems: number): string {
  return `Tengo dudas sobre mi carrito de ${cantidadItems} ${cantidadItems === 1 ? 'producto' : 'productos'}.`;
}

/** Lo que el cliente ve en pantalla, para la revalidación (C11). */
export function pantallaDe(carrito: Carrito, codigoCupon: string | null) {
  return {
    lineas: carrito.lineas.map((l) => ({ idLinea: l.idLinea, subtotal: l.precio?.subtotal ?? null })),
    total: carrito.calculo?.resumen.total ?? 0,
    ...(codigoCupon === null ? {} : { codigoCupon }),
  };
}
