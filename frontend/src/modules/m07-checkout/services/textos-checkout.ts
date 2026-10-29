import type { BadgeVariant } from '@/core/components';
import { CANTIDAD_MAXIMA_LINEA } from '@/modules/m06-precios/dtos/m06-precios.dto';
import type { CompraDirecta, EstadoSolicitud, Solicitud } from '../dtos/m07-checkout.dto';

/** Pasos de la compra (UI §4.7): Carrito → Pago → Orden. En la compra directa (R17) el primero es el producto. */
export const PASOS_COMPRA = ['Carrito', 'Pago', 'Orden'] as const;
export const PASOS_COMPRA_DIRECTA = ['Producto', 'Pago', 'Orden'] as const;

/** R17: la compra directa que viene en la dirección (`?idVariante=…&idColor=…&cantidad=…`); null si no la hay. */
export function compraDirectaDeUrl(params: { get(nombre: string): string | null }): CompraDirecta | null {
  const entero = (v: string | null): number | null => {
    const n = Number(v);
    return v !== null && Number.isInteger(n) && n > 0 ? n : null;
  };
  const idVariante = entero(params.get('idVariante'));
  if (idVariante === null) return null;
  return {
    idVariante,
    idColor: entero(params.get('idColor')),
    cantidad: Math.min(entero(params.get('cantidad')) ?? 1, CANTIDAD_MAXIMA_LINEA),
  };
}

export const ETIQUETA_ESTADO: Record<EstadoSolicitud, string> = {
  en_pago: 'Esperando el pago',
  rechazada: 'Pago rechazado',
  pagada: 'Pagada, creando el pedido',
  completada: 'Pedido creado',
  en_revision: 'En revisión',
  vencida: 'Vencida',
  cancelada: 'Cancelada',
};

export const VARIANTE_ESTADO: Record<EstadoSolicitud, BadgeVariant> = {
  en_pago: 'action',
  rechazada: 'danger',
  pagada: 'action',
  completada: 'success',
  en_revision: 'offer',
  vencida: 'neutral',
  cancelada: 'neutral',
};

export const FILTROS_ESTADO: ReadonlyArray<{ valor: EstadoSolicitud | null; etiqueta: string }> = [
  { valor: null, etiqueta: 'Todas' },
  { valor: 'en_revision', etiqueta: 'En revisión' },
  { valor: 'pagada', etiqueta: 'Pagadas sin pedido' },
  { valor: 'en_pago', etiqueta: 'Esperando el pago' },
  { valor: 'completada', etiqueta: 'Con pedido' },
  { valor: 'rechazada', etiqueta: 'Rechazadas' },
  { valor: 'vencida', etiqueta: 'Vencidas' },
  { valor: 'cancelada', etiqueta: 'Canceladas' },
];

export function estadoDeUrl(valor: string | null): EstadoSolicitud | null {
  return FILTROS_ESTADO.find((f) => f.valor !== null && f.valor === valor)?.valor ?? null;
}

export function paginaDeUrl(valor: string | null): number {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

/** Paso del Stepper según el estado: 1 = pago, 2 = orden. */
export function pasoDe(estado: EstadoSolicitud): number {
  return estado === 'completada' ? 2 : 1;
}

/** Mientras la pantalla deba seguir preguntando por la compra. */
export function sigueEnCurso(s: Pick<Solicitud, 'estado' | 'intentos'>): boolean {
  if (s.estado === 'pagada') return true;
  return s.estado === 'en_pago' && s.intentos.at(-1)?.estadoWompi === 'PENDING';
}

export function fechaHora(iso: string): string {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' }).format(
    new Date(iso),
  );
}

/** Texto del envío en el resumen. */
export function textoEnvio(costo: number, formato: (n: number) => string): string {
  return costo === 0 ? 'Gratis' : formato(costo);
}
