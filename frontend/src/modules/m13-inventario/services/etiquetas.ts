import type { MotivoAjuste, MotivoRechazo, OrigenAjuste } from '../dtos/m13-inventario.dto';

export const ETIQUETAS_MOTIVO: Record<MotivoAjuste, string> = {
  conteo_fisico: 'Conteo físico',
  ingreso_mercancia: 'Ingreso de mercancía',
  salida: 'Salida',
  correccion: 'Corrección',
  otro: 'Otro',
  carga_masiva: 'Carga masiva',
  venta: 'Venta',
  devolucion: 'Devolución',
};

export const ETIQUETAS_ORIGEN: Record<OrigenAjuste, string> = {
  manual: 'Manual',
  carga_masiva: 'Carga masiva',
  samit: 'SAMIT',
  orden: 'Orden de venta',
};

export const ETIQUETAS_RECHAZO: Record<MotivoRechazo, string> = {
  identificador_ausente: 'Falta el SKU, o la marca, el producto y la medida.',
  variante_no_encontrada: 'No se encontró esa variante en el catálogo.',
  variante_repetida_en_bloque: 'La variante aparece más de una vez en el mismo grupo de filas.',
  existencia_invalida: 'La existencia debe ser un número entero entre 0 y 2 147 483 647.',
};

const FORMATO_FECHA = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

/** "2026-10-25T13:02:00.000Z" → "25 oct 2026, 8:02 a. m." (hora local del navegador). */
export function formatearFecha(iso: string): string {
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime()) ? iso : FORMATO_FECHA.format(fecha);
}

export const formatearNumero = (n: number): string => n.toLocaleString('es-CO');
