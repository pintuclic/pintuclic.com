import type { HojaPreparacion, LineaVerificacion, OrdenRetenida, VerificacionOrden } from '../dtos/m09-cumplimiento.dto';

export function lineaVerificacion(sobrescribir: Partial<LineaVerificacion> = {}): LineaVerificacion {
  return {
    numeroLinea: 1,
    nombreProducto: 'Vinilo Tipo 1',
    varianteCopia: 'Galón',
    colorSolicitado: null,
    cantidad: 2,
    esEntonado: false,
    baseConsumida: null,
    estado: 'pendiente',
    historial: [],
    ...sobrescribir,
  };
}

export function verificacion(lineas: LineaVerificacion[], sobrescribir: Partial<VerificacionOrden> = {}): VerificacionOrden {
  const sinConfirmar = lineas.filter((l) => l.estado === 'pendiente' || l.estado === 'consiguiendo_stock' || l.estado === 'no_disponible').length;
  return {
    codigo: 'PC-2026-00001',
    estado: 'revision_disponibilidad',
    lineasSinConfirmar: sinConfirmar,
    completa: sinConfirmar === 0,
    lineas,
    cancelacion: null,
    ...sobrescribir,
  };
}

export const HOJA: HojaPreparacion = {
  codigo: 'PC-2026-00001',
  generadaEn: '2026-10-30T15:00:00.000Z',
  estado: 'en_preparacion',
  lineas: [
    { numeroLinea: 1, nombreProducto: 'Vinilo Tipo 1', varianteCopia: 'Galón', colorSolicitado: 'Rojo Colonial', cantidad: 2, baseConsumida: 'Base Deep 1 gal' },
    { numeroLinea: 2, nombreProducto: 'Brocha 4"', varianteCopia: 'Unidad', colorSolicitado: null, cantidad: 1, baseConsumida: null },
  ],
};

export const RETENIDA: OrdenRetenida = {
  codigo: 'PC-2026-00007',
  cliente: 'Ana Pérez',
  fecha: '2026-10-28T00:00:00.000Z',
  segundosEnEstado: 90000,
  lineasSinConfirmar: 2,
  lineasTotales: 3,
  motivos: [
    { descripcion: 'Vinilo Tipo 1 — Galón', estado: 'consiguiendo_stock' },
    { descripcion: 'Rodillo felpa — Unidad', estado: 'pendiente' },
  ],
};

export const PAGINACION = { pagina: 1, limite: 20, total: 1, totalPaginas: 1 };
