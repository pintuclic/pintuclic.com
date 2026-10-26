import { apiClient } from '@/core/api/apiClient';
import type {
  ColorBuscado,
  OpcionesFiltro,
  PaginaBusqueda,
  PaginacionBusqueda,
  ResultadoBusqueda,
} from '../dtos/busqueda.dto';
import type { FiltrosBusqueda } from './filtros-busqueda';

interface SobrePaginado<T> {
  success: boolean;
  data: T[];
  pagination: PaginacionBusqueda;
}

interface SobreUno<T> {
  success: boolean;
  data: T;
}

const RUTA_BUSQUEDA = '/busqueda';

function construirParametros(filtros: Partial<FiltrosBusqueda>): Record<string, string | number> {
  const params: Record<string, string | number> = {};

  if (filtros.q && filtros.q.trim()) params.q = filtros.q.trim();
  if (filtros.idCategoria && filtros.idCategoria.length > 0) params.idCategoria = filtros.idCategoria.join(',');
  if (filtros.idSubcategoria && filtros.idSubcategoria.length > 0) params.idSubcategoria = filtros.idSubcategoria.join(',');
  if (filtros.idMarca && filtros.idMarca.length > 0) params.idMarca = filtros.idMarca.join(',');
  if (filtros.idLinea && filtros.idLinea.length > 0) params.idLinea = filtros.idLinea.join(',');
  if (filtros.idTipoResina && filtros.idTipoResina.length > 0) params.idTipoResina = filtros.idTipoResina.join(',');
  if (filtros.idFamiliaColor && filtros.idFamiliaColor.length > 0) params.idFamiliaColor = filtros.idFamiliaColor.join(',');
  if (filtros.idColor && filtros.idColor.length > 0) params.idColor = filtros.idColor.join(',');
  if (filtros.idMedida && filtros.idMedida.length > 0) params.idMedida = filtros.idMedida.join(',');
  if (filtros.idSuperficie && filtros.idSuperficie.length > 0) params.idSuperficie = filtros.idSuperficie.join(',');

  if (filtros.ambiente) params.ambiente = filtros.ambiente;
  if (filtros.precioMin !== undefined) params.precioMin = filtros.precioMin;
  if (filtros.precioMax !== undefined) params.precioMax = filtros.precioMax;

  if (filtros.ordenar && filtros.ordenar !== 'relevancia') params.ordenar = filtros.ordenar;
  if (filtros.pagina && filtros.pagina > 1) params.pagina = filtros.pagina;
  if (filtros.limite && filtros.limite !== 12) params.limite = filtros.limite;

  return params;
}

export const busquedaApi = {
  productos: async (filtros: Partial<FiltrosBusqueda> = {}): Promise<PaginaBusqueda<ResultadoBusqueda>> => {
    const params = construirParametros(filtros);
    const { data } = await apiClient.get<SobrePaginado<ResultadoBusqueda>>(`${RUTA_BUSQUEDA}/productos`, { params });
    return {
      items: data.data,
      paginacion: data.pagination,
    };
  },

  filtros: async (filtros: Partial<FiltrosBusqueda> = {}): Promise<OpcionesFiltro> => {
    const params = construirParametros(filtros);
    const { data } = await apiClient.get<SobreUno<OpcionesFiltro>>(`${RUTA_BUSQUEDA}/filtros`, { params });
    return data.data;
  },

  colores: async (
    q: string,
    idFamiliaColor?: number[],
    idMarca?: number[],
  ): Promise<PaginaBusqueda<ColorBuscado>> => {
    const params: Record<string, string | number> = { q };
    if (idFamiliaColor && idFamiliaColor.length > 0) params.idFamiliaColor = idFamiliaColor.join(',');
    if (idMarca && idMarca.length > 0) params.idMarca = idMarca.join(',');

    const { data } = await apiClient.get<SobrePaginado<ColorBuscado>>(`${RUTA_BUSQUEDA}/colores`, { params });
    return {
      items: data.data,
      paginacion: data.pagination,
    };
  },

  urlImagen: (idImagen: number, tamano: 'miniatura' | 'mediana' | 'original' = 'miniatura'): string =>
    `${apiClient.defaults.baseURL ?? '/api/v1'}/catalogo/imagenes/${idImagen}${tamano === 'original' ? '' : `?tamano=${tamano}`}`,
};
