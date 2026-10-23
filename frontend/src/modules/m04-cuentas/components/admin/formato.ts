import type { EstadoSolicitudEmpresa, TipoSolicitudEmpresa } from '../../dtos/m04-cuentas.dto';

export const ETIQUETA_ESTADO: Record<EstadoSolicitudEmpresa, string> = {
  pendiente: 'Pendiente',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
};

export const ETIQUETA_TIPO: Record<TipoSolicitudEmpresa, string> = {
  registro: 'Registro nuevo',
  ascenso_particular: 'Ascenso de cuenta personal',
};

export function formatoFecha(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
}

export function formatoTamano(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * RN-CUE-17: el motivo es obligatorio (≥ 10 caracteres) solo al rechazar un
 * REGISTRO de empresa; en ascensos y renovaciones es opcional.
 */
export function motivoObligatorio(tipo: TipoSolicitudEmpresa | 'renovacion'): boolean {
  return tipo === 'registro';
}
