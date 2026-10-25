import { isAxiosError } from 'axios';
import { apiClient, esRespuestaError } from '@/core/api/apiClient';
import type { RespuestaExitosa } from '@/core/types/respuesta-api.type';
import type {
  AjustarExistenciaRequest,
  AjusteInventario,
  FilaCarga,
  ItemInventario,
  ResumenInventario,
} from '../dtos/m13-inventario.dto';
import type { MarcaFiltro, PaginaApi, PaginacionApi, ParametrosConsulta } from '../interfaces/inventario.interface';

const BASE = '/admin/inventario';

interface SobrePaginado<T> {
  success: true;
  data: T[];
  pagination: PaginacionApi;
}

/** Quita las claves sin valor: un filtro vacío no viaja en la URL. */
export function limpiarParametros(params: ParametrosConsulta): Record<string, string | number | boolean> {
  const limpio: Record<string, string | number | boolean> = {};
  for (const [clave, valor] of Object.entries(params)) {
    if (valor !== undefined && valor !== '') limpio[clave] = valor;
  }
  return limpio;
}

async function obtener<T>(ruta: string, params: ParametrosConsulta = {}): Promise<T> {
  const { data } = await apiClient.get<RespuestaExitosa<T>>(ruta, { params: limpiarParametros(params) });
  return data.data;
}

async function obtenerPagina<T>(ruta: string, params: ParametrosConsulta = {}): Promise<PaginaApi<T>> {
  const { data } = await apiClient.get<SobrePaginado<T>>(ruta, { params: limpiarParametros(params) });
  return { items: data.data, paginacion: data.pagination };
}

/**
 * Con `responseType: 'arraybuffer'` hasta el cuerpo de un error llega como bytes: se vuelve a
 * leer como JSON para que el mensaje de la API (p. ej. "descárguela por marca") llegue a la pantalla.
 */
async function errorLegible(err: unknown): Promise<unknown> {
  if (!isAxiosError<unknown>(err) || !(err.response?.data instanceof ArrayBuffer)) return err;
  try {
    const cuerpo: unknown = JSON.parse(new TextDecoder().decode(err.response.data));
    return esRespuestaError(cuerpo) ? new Error(cuerpo.error.message) : err;
  } catch {
    return err;
  }
}

export interface ResultadoAjusteApi {
  item: ItemInventario;
  /** null cuando el valor no cambió. */
  ajuste: AjusteInventario | null;
}

export type ResultadoFilaApi = {
  indice: number;
  resultado: 'modificada' | 'sin_cambios' | 'rechazada';
  idVariante: number | null;
  variante: string | null;
  existenciaAnterior: number | null;
  existenciaNueva: number | null;
  motivoRechazo: string | null;
};

export interface ResultadoCargaApi {
  aplicada: boolean;
  idCarga: string | null;
  balance: { total: number; modificadas: number; sinCambios: number; rechazadas: number };
  filas: ResultadoFilaApi[];
}

export const inventarioApi = {
  resumen: () => obtener<ResumenInventario>(`${BASE}/resumen`),
  listar: (params: ParametrosConsulta) => obtenerPagina<ItemInventario>(`${BASE}/variantes`, params),
  obtener: (idVariante: number) => obtener<ItemInventario>(`${BASE}/variantes/${idVariante}`),
  ajustar: async (idVariante: number, cuerpo: AjustarExistenciaRequest): Promise<ResultadoAjusteApi> => {
    const { data } = await apiClient.put<RespuestaExitosa<ResultadoAjusteApi>>(
      `${BASE}/variantes/${idVariante}/existencia`,
      cuerpo,
    );
    return data.data;
  },
  historial: (params: ParametrosConsulta) => obtenerPagina<AjusteInventario>(`${BASE}/historial`, params),
  /** La plantilla llega como bytes para conservar el BOM que necesita Excel (D4). */
  descargarPlantilla: async (params: ParametrosConsulta): Promise<ArrayBuffer> => {
    try {
      const { data } = await apiClient.get<ArrayBuffer>(`${BASE}/plantilla`, {
        params: limpiarParametros(params),
        responseType: 'arraybuffer',
      });
      return data;
    } catch (err: unknown) {
      throw await errorLegible(err);
    }
  },
  previsualizar: async (filas: FilaCarga[]): Promise<ResultadoCargaApi> => {
    const { data } = await apiClient.post<RespuestaExitosa<ResultadoCargaApi>>(`${BASE}/cargas/previsualizar`, {
      filas,
    });
    return data.data;
  },
  aplicar: async (idCarga: string, filas: FilaCarga[]): Promise<ResultadoCargaApi> => {
    const { data } = await apiClient.post<RespuestaExitosa<ResultadoCargaApi>>(`${BASE}/cargas/aplicar`, {
      idCarga,
      filas,
    });
    return data.data;
  },
};

/** Marcas del catálogo (M01) para el filtro y la plantilla; es la misma API que usa el catálogo. */
export const marcasFiltroApi = {
  listar: async (): Promise<MarcaFiltro[]> => {
    const pagina = await obtenerPagina<MarcaFiltro>('/admin/catalogo/marcas', { estado: 'activo', limite: 100 });
    return pagina.items;
  },
};
