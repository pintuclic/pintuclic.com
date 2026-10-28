/** Secciones de `/admin/inventario`, tal como viajan en la URL. */
export const SECCIONES_INVENTARIO = ['existencias', 'carga', 'historial'] as const;
export type SeccionInventario = (typeof SECCIONES_INVENTARIO)[number];

export const RUTA_ADMIN_INVENTARIO = '/admin/inventario';

export function leerSeccion(valor: string | null): SeccionInventario {
  return SECCIONES_INVENTARIO.find((s) => s === valor) ?? 'existencias';
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Filtros del historial que pueden venir de otra pantalla ("Ver historial"). */
export interface FiltrosHistorialEnlace {
  idVariante?: number;
  idCarga?: string;
}

export function enlaceSeccion(seccion: SeccionInventario, filtros: FiltrosHistorialEnlace = {}): string {
  const params = new URLSearchParams({ seccion });
  if (filtros.idVariante !== undefined) params.set('idVariante', String(filtros.idVariante));
  if (filtros.idCarga !== undefined) params.set('idCarga', filtros.idCarga);
  return `${RUTA_ADMIN_INVENTARIO}?${params.toString()}`;
}

/** Lee los filtros de la URL; lo que no sea un entero positivo o un uuid se descarta. */
export function filtrosHistorialDesdeUrl(params: URLSearchParams): { idVariante: string; idCarga: string } {
  const variante = params.get('idVariante');
  const carga = params.get('idCarga');
  return {
    idVariante: variante !== null && /^\d+$/.test(variante) && Number(variante) > 0 ? variante : '',
    idCarga: carga !== null && UUID.test(carga) ? carga : '',
  };
}

/** Identificador de una carga (D3). `randomUUID` solo existe en contextos seguros: hay respaldo. */
export function nuevoIdCarga(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
