import { apiClient } from '@/core/api/apiClient';
import type { RespuestaExitosa } from '@/core/types/respuesta-api.type';
import type {
  Agrupacion,
  Compradores,
  DimensionVenta,
  FacturacionReporte,
  PostventaReporte,
  ReporteDescuentos,
  ResumenVentas,
  SerieVentas,
  TopClientes,
  VentasPor,
} from '../dtos/m19-reportes.dto';

export interface RangoConsulta {
  desde: string;
  hasta: string;
}

const RUTA = '/admin/reportes';
const parametros = (r: RangoConsulta, extra: Record<string, string | number> = {}) => ({ desde: r.desde, hasta: r.hasta, ...extra });

async function leer<T>(ruta: string, params: Record<string, string | number>): Promise<T> {
  const { data } = await apiClient.get<RespuestaExitosa<T>>(`${RUTA}${ruta}`, { params });
  return data.data;
}

export const reportesApi = {
  resumen: (r: RangoConsulta) => leer<ResumenVentas>('/resumen', parametros(r)),
  serie: (r: RangoConsulta, agrupar: Agrupacion) => leer<SerieVentas>('/serie', parametros(r, { agrupar })),
  ventasPor: (dimension: DimensionVenta, r: RangoConsulta, orden: 'importe' | 'unidades', limite: number) =>
    leer<VentasPor>(`/ventas-por/${dimension}`, parametros(r, { orden, limite })),
  descuentos: (r: RangoConsulta) => leer<ReporteDescuentos>('/descuentos', parametros(r)),
  clientes: (r: RangoConsulta, limite: number) => leer<TopClientes>('/clientes', parametros(r, { limite })),
  compradores: (r: RangoConsulta) => leer<Compradores>('/compradores', parametros(r)),
  postventa: (r: RangoConsulta) => leer<PostventaReporte>('/postventa', parametros(r)),
  facturacion: (r: RangoConsulta) => leer<FacturacionReporte>('/facturacion', parametros(r)),
};

/** Descarga el reporte en CSV (exige `ventas.exportar`): pide el archivo con las mismas condiciones de la pantalla y lo guarda. */
export async function descargarCsv(ruta: string, params: Record<string, string | number>): Promise<void> {
  const respuesta = await apiClient.get<Blob>(`${RUTA}${ruta}`, { params: { ...params, formato: 'csv' }, responseType: 'blob' });
  const disposicion = String(respuesta.headers['content-disposition'] ?? '');
  const nombre = /filename="([^"]+)"/.exec(disposicion)?.[1] ?? 'reporte.csv';
  const url = URL.createObjectURL(respuesta.data);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}
