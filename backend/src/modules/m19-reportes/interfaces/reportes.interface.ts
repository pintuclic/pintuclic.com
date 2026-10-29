import type { Agrupacion, CifrasVenta, Compradores, DimensionVenta, FacturacionReporte, PostventaReporte, ReporteDescuentos, TopClientes } from '../dtos/m19-reportes.dto';

/** Rango ya validado: fechas de calendario `AAAA-MM-DD`, ambas incluidas. */
export interface RangoFechas {
  desde: string;
  hasta: string;
}

export interface FilaPorEstado {
  estado: string;
  ordenes: number;
  total: number;
}

export interface PuntoCrudo {
  /** Inicio del intervalo (R5). */
  periodo: string;
  ordenes: number;
  unidades: number;
  totalCobrado: number;
}

export interface FilaVentaPorCrudo {
  clave: string;
  etiqueta: string;
  ordenes: number;
  unidades: number;
  importe: number;
}

/** Solo lectura: cada método es una agregación en la base (M19 · R13). */
export interface ReportesRepositoryPort {
  cifras(rango: RangoFechas): Promise<CifrasVenta>;
  porEstado(rango: RangoFechas): Promise<FilaPorEstado[]>;
  serie(rango: RangoFechas, agrupar: Agrupacion): Promise<PuntoCrudo[]>;
  ventasPor(dimension: DimensionVenta, rango: RangoFechas, orden: 'importe' | 'unidades', limite: number): Promise<{ filas: FilaVentaPorCrudo[]; total: { ordenes: number; unidades: number; importe: number } }>;
  descuentos(rango: RangoFechas): Promise<Omit<ReporteDescuentos, 'periodo'>>;
  topClientes(rango: RangoFechas, limite: number): Promise<Omit<TopClientes, 'periodo'>>;
  compradores(rango: RangoFechas): Promise<Omit<Compradores, 'periodo'>>;
  postventa(rango: RangoFechas): Promise<Omit<PostventaReporte, 'periodo'>>;
  facturacion(rango: RangoFechas): Promise<Omit<FacturacionReporte, 'periodo'>>;
}
