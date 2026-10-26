import type { BadgeVariant } from '@/core/components';
import type { EstadoCotizacion } from '../dtos/m21-cotizaciones.dto';

/** Nombre de cada estado para el cliente y el panel (`borrador` es igual a `solicitada`). */
export const ETIQUETA_ESTADO: Record<EstadoCotizacion, string> = {
  solicitada: 'En revisión',
  borrador: 'En revisión',
  enviada: 'Respondida',
  aprobada: 'Aceptada',
  rechazada: 'Rechazada',
  vencida: 'Vencida',
};

export const VARIANTE_ESTADO: Record<EstadoCotizacion, BadgeVariant> = {
  solicitada: 'action',
  borrador: 'action',
  enviada: 'offer',
  aprobada: 'success',
  rechazada: 'danger',
  vencida: 'neutral',
};

/** Filtros por estado (el de `borrador` no se muestra: va dentro de "En revisión"). */
export const FILTROS_ESTADO: ReadonlyArray<{ valor: EstadoCotizacion | null; etiqueta: string }> = [
  { valor: null, etiqueta: 'Todas' },
  { valor: 'solicitada', etiqueta: 'En revisión' },
  { valor: 'enviada', etiqueta: 'Respondidas' },
  { valor: 'aprobada', etiqueta: 'Aceptadas' },
  { valor: 'rechazada', etiqueta: 'Rechazadas' },
  { valor: 'vencida', etiqueta: 'Vencidas' },
];

const ESTADOS: readonly EstadoCotizacion[] = ['solicitada', 'borrador', 'enviada', 'aprobada', 'rechazada', 'vencida'];

/** Lee el estado de la URL (`?estado=`); uno desconocido se ignora. */
export function estadoDeUrl(valor: string | null): EstadoCotizacion | null {
  return ESTADOS.find((e) => e === valor) ?? null;
}

/** Página de la URL (`?pagina=`), 1 si falta o no es válida. */
export function paginaDeUrl(valor: string | null): number {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

const FORMATO_FECHA = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Bogota' });

/** "26 oct 2026". Acepta un ISO completo o una fecha AAAA-MM-DD (que se lee como ese día, sin zona). */
export function fechaCorta(valor: string): string {
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(valor) ? new Date(`${valor}T12:00:00-05:00`) : new Date(valor);
  return FORMATO_FECHA.format(fecha);
}

const redondear = (v: number): number => Math.round((v + Number.EPSILON) * 100) / 100;

/** Atajo del panel: precio con un % de descuento sobre la referencia. */
export function precioConDescuento(referencia: number, porcentaje: number): number {
  return redondear(referencia * (1 - porcentaje / 100));
}

/** Lo que se escribe en "% desc.": devuelve el precio con ese descuento, o null si aún no es un % válido (0 a 99,99). */
export function precioDesdePorcentaje(referencia: number, texto: string): number | null {
  const limpio = texto.trim().replace(',', '.');
  if (!/^\d{1,2}(\.\d{0,2})?$/.test(limpio)) return null;
  const porcentaje = Number(limpio);
  return porcentaje < 100 ? precioConDescuento(referencia, porcentaje) : null;
}

/** % de descuento que representa un precio acordado frente a la referencia (puede ser negativo). */
export function porcentajeDescuento(referencia: number, acordado: number): number {
  if (referencia <= 0) return 0;
  return redondear((1 - acordado / referencia) * 100);
}

/** Lo que el cliente puede hacer según el estado. */
export function textoSiguientePaso(estado: EstadoCotizacion, fechaVencimiento: string | null): string {
  switch (estado) {
    case 'solicitada':
    case 'borrador':
      return 'Nuestro equipo comercial está revisando tu solicitud. Te avisaremos cuando la respondamos.';
    case 'enviada':
      return fechaVencimiento === null
        ? 'Revisa los precios y acepta la cotización para pasar los productos a tu carrito.'
        : `Revisa los precios y acepta la cotización antes del ${fechaCorta(fechaVencimiento)} para pasar los productos a tu carrito.`;
    case 'aprobada':
      return 'Aceptaste esta cotización: sus productos están en tu carrito con el precio acordado.';
    case 'rechazada':
      return 'Esta cotización fue rechazada.';
    case 'vencida':
      return 'Esta cotización venció. Puedes pedir una nueva desde tu carrito.';
  }
}
