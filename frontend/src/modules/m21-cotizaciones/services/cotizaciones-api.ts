import { isAxiosError } from 'axios';
import { apiClient, esRespuestaError } from '@/core/api/apiClient';
import type {
  ActualizarCotizacionRequest,
  CotizacionDetalle,
  CotizacionResumen,
  EstadoCotizacion,
} from '../dtos/m21-cotizaciones.dto';

interface SobreUno<T> {
  success: boolean;
  data: T;
}

export interface PaginaCotizaciones {
  items: CotizacionResumen[];
  pagina: number;
  totalPaginas: number;
  total: number;
}

interface SobrePagina {
  success: boolean;
  data: CotizacionResumen[];
  pagination: { pagina: number; limite: number; total: number; totalPaginas: number };
}

const aPagina = (s: SobrePagina): PaginaCotizaciones => ({
  items: s.data,
  pagina: s.pagination.pagina,
  totalPaginas: s.pagination.totalPaginas,
  total: s.pagination.total,
});

export interface FiltroLista {
  estado: EstadoCotizacion | null;
  pagina: number;
  busqueda?: string;
}

function parametros(f: FiltroLista): Record<string, string | number> {
  return {
    pagina: f.pagina,
    limite: 20,
    ...(f.estado === null ? {} : { estado: f.estado }),
    ...(f.busqueda === undefined || f.busqueda.trim() === '' ? {} : { busqueda: f.busqueda.trim() }),
  };
}

/** Rutas del cliente (`/cotizaciones`) y del panel (`/admin/cotizaciones`). La sesión viaja en cookie HttpOnly. */
export const cotizacionesApi = {
  solicitar: async (comentario: string): Promise<CotizacionDetalle> =>
    (await apiClient.post<SobreUno<CotizacionDetalle>>('/cotizaciones', comentario === '' ? {} : { comentario })).data.data,

  misCotizaciones: async (f: FiltroLista): Promise<PaginaCotizaciones> =>
    aPagina((await apiClient.get<SobrePagina>('/cotizaciones', { params: parametros(f) })).data),

  miCotizacion: async (id: number): Promise<CotizacionDetalle> =>
    (await apiClient.get<SobreUno<CotizacionDetalle>>(`/cotizaciones/${id}`)).data.data,

  aceptar: async (id: number): Promise<CotizacionDetalle> =>
    (await apiClient.post<SobreUno<CotizacionDetalle>>(`/cotizaciones/${id}/aceptar`)).data.data,

  rechazarComoCliente: async (id: number, motivo: string): Promise<CotizacionDetalle> =>
    (await apiClient.post<SobreUno<CotizacionDetalle>>(`/cotizaciones/${id}/rechazar`, motivo === '' ? {} : { motivo })).data
      .data,

  listarAdmin: async (f: FiltroLista): Promise<PaginaCotizaciones> =>
    aPagina((await apiClient.get<SobrePagina>('/admin/cotizaciones', { params: parametros(f) })).data),

  obtenerAdmin: async (id: number): Promise<CotizacionDetalle> =>
    (await apiClient.get<SobreUno<CotizacionDetalle>>(`/admin/cotizaciones/${id}`)).data.data,

  actualizar: async (id: number, cuerpo: ActualizarCotizacionRequest): Promise<CotizacionDetalle> =>
    (await apiClient.put<SobreUno<CotizacionDetalle>>(`/admin/cotizaciones/${id}`, cuerpo)).data.data,

  enviar: async (id: number): Promise<CotizacionDetalle> =>
    (await apiClient.post<SobreUno<CotizacionDetalle>>(`/admin/cotizaciones/${id}/enviar`)).data.data,

  rechazarComoAdmin: async (id: number, motivo: string): Promise<CotizacionDetalle> =>
    (await apiClient.post<SobreUno<CotizacionDetalle>>(`/admin/cotizaciones/${id}/rechazar`, { motivo })).data.data,
};

/** Prefiere el mensaje del envelope de la API; si no hay uno legible, usa el respaldo. */
export function mensajeDeError(err: unknown, respaldo: string): string {
  if (isAxiosError<unknown>(err) && esRespuestaError(err.response?.data)) return err.response.data.error.message;
  return respaldo;
}

/** 401 o 404 al pedir: hace falta iniciar sesión. */
export function requiereSesion(err: unknown): boolean {
  return isAxiosError(err) && err.response?.status === 401;
}
