import type {
  EstadoPostventa,
  TipoPostventa,
  MetodoReembolso,
  MotivoRechazoPostventa,
} from '../dtos/m11-postventa.dto';

export const ETIQUETA_TIPO_POSTVENTA: Record<TipoPostventa, string> = {
  cancelacion: 'Cancelación',
  devolucion: 'Devolución (Retracto)',
  garantia: 'Reclamación por Garantía',
};

export const ETIQUETA_ESTADO_POSTVENTA: Record<EstadoPostventa, string> = {
  solicitada: 'Solicitada',
  en_revision: 'En revisión',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
  reembolsada: 'Reembolsada',
};

export const CLASE_ESTADO_POSTVENTA: Record<EstadoPostventa, string> = {
  solicitada: 'bg-primary-50 text-primary-700 border-primary-200',
  en_revision: 'bg-amber-50 text-amber-800 border-amber-200',
  aprobada: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  rechazada: 'bg-rose-50 text-rose-800 border-rose-200',
  reembolsada: 'bg-blue-50 text-blue-800 border-blue-200',
};

export const ETIQUETA_METODO_REEMBOLSO: Record<MetodoReembolso, string> = {
  transferencia_bancaria: 'Transferencia bancaria',
  reverso_pasarela: 'Reverso en pasarela (Wompi)',
  saldo_tienda: 'Saldo en tienda / Bono',
  efectivo: 'Efectivo',
};

export const ETIQUETA_MOTIVO_RECHAZO: Record<MotivoRechazoPostventa, string> = {
  fuera_de_plazo: 'Solicitud radicada fuera del plazo legal o de garantía',
  producto_entonado: 'Pintura o producto preparado a la medida (excluido de retracto legal)',
  producto_abierto_o_danado: 'Producto abierto, usado o con empaque deteriorado no imputable a la entrega',
  evidencia_insuficiente: 'Evidencia o información fotográfica insuficiente para evaluar el defecto',
  politica_no_cumplida: 'No cumple con las condiciones generales de la política de devoluciones',
  otro: 'Otro motivo especificado en observaciones',
};

export function formatearMoneda(valor: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(valor);
}

export function formatearFecha(iso: string): string {
  try {
    const fecha = new Date(iso);
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(fecha);
  } catch {
    return iso;
  }
}
