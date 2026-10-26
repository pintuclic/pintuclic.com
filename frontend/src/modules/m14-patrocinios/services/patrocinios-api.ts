import { apiClient } from '@/core/api/apiClient';
import type { RespuestaExitosa } from '@/core/types/respuesta-api.type';
import type {
  Campania,
  CampaniaRequest,
  CampaniaResumen,
  CambiarEstadoRequest,
  Estado,
  ObjetivoPatrocinio,
  ProductoCubierto,
  ProductoPatrocinado,
  ReferenciaPatrocinio,
  TipoObjetivoPatrocinio,
} from '../dtos/m14-patrocinios.dto';
import type { PaginaApi, PaginacionApi, ParametrosConsulta } from '../interfaces/patrocinios.interface';

const BASE = '/admin/patrocinios';

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

async function enviar<T>(metodo: 'post' | 'put' | 'patch', ruta: string, cuerpo: unknown): Promise<T> {
  const { data } = await apiClient[metodo]<RespuestaExitosa<T>>(ruta, cuerpo);
  return data.data;
}

/** Administración de campañas de patrocinio (requiere `patrocinios.ver` / `patrocinios.editar`). */
export const campaniasApi = {
  listar: (params: ParametrosConsulta) => obtenerPagina<CampaniaResumen>(`${BASE}/campanias`, params),
  obtener: (idCampania: number) => obtener<Campania>(`${BASE}/campanias/${idCampania}`),
  crear: (cuerpo: CampaniaRequest) => enviar<Campania>('post', `${BASE}/campanias`, cuerpo),
  actualizar: (idCampania: number, cuerpo: CampaniaRequest) =>
    enviar<Campania>('put', `${BASE}/campanias/${idCampania}`, cuerpo),
  cambiarEstado: (idCampania: number, estado: Estado) =>
    enviar<Campania>('patch', `${BASE}/campanias/${idCampania}/estado`, { estado } satisfies CambiarEstadoRequest),
  productos: (idCampania: number, pagina: number, limite: number) =>
    obtenerPagina<ProductoCubierto>(`${BASE}/campanias/${idCampania}/productos`, { pagina, limite }),
  /** Qué productos cubrirían estos objetivos, antes de guardar (A12). */
  vistaPrevia: async (
    objetivos: readonly ObjetivoPatrocinio[],
    pagina: number,
    limite: number,
  ): Promise<PaginaApi<ProductoCubierto>> => {
    const { data } = await apiClient.post<SobrePaginado<ProductoCubierto>>(
      `${BASE}/campanias/vista-previa`,
      { objetivos },
      { params: { pagina, limite } },
    );
    return { items: data.data, paginacion: data.pagination };
  },
  buscarReferencias: (tipo: TipoObjetivoPatrocinio, busqueda: string, limite = 20) =>
    obtener<Array<Omit<ReferenciaPatrocinio, 'existe'>>>(`${BASE}/referencias`, { tipo, busqueda, limite }),
};

/** Lo que ve cualquier visitante (sin sesión). */
export const patrociniosPublicoApi = {
  /** El bloque «Productos patrocinados» del inicio (A10). */
  productosDelInicio: (limite?: number) => obtener<ProductoPatrocinado[]>('/patrocinios/productos', { limite }),
};
