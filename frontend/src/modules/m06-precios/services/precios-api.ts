import { apiClient } from '@/core/api/apiClient';
import type { RespuestaExitosa } from '@/core/types/respuesta-api.type';
import type {
  ActualizarCuponRequest,
  Calculo,
  CambiarEstadoRequest,
  CrearCuponRequest,
  CrearEventoRequest,
  CrearTipoClienteRequest,
  Cupon,
  Estado,
  Evento,
  EventoPublico,
  EventoResumen,
  ProductoAfectado,
  ReferenciaCatalogo,
  SimularRequest,
  TipoClienteEmpresa,
  TipoExclusion,
  UsoCupon,
} from '../dtos/m06-precios.dto';
import type { PaginaApi, PaginacionApi, ParametrosConsulta } from '../interfaces/precios.interface';

const BASE = '/admin/precios';

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

export const eventosApi = {
  listar: (params: ParametrosConsulta) => obtenerPagina<EventoResumen>(`${BASE}/eventos`, params),
  obtener: (idEvento: number) => obtener<Evento>(`${BASE}/eventos/${idEvento}`),
  crear: (cuerpo: CrearEventoRequest) => enviar<Evento>('post', `${BASE}/eventos`, cuerpo),
  actualizar: (idEvento: number, cuerpo: CrearEventoRequest) =>
    enviar<Evento>('put', `${BASE}/eventos/${idEvento}`, cuerpo),
  cambiarEstado: (idEvento: number, estado: Estado) =>
    enviar<Evento>('patch', `${BASE}/eventos/${idEvento}/estado`, { estado } satisfies CambiarEstadoRequest),
  vistaPrevia: async (
    cuerpo: CrearEventoRequest,
    pagina: number,
    limite: number,
  ): Promise<PaginaApi<ProductoAfectado>> => {
    const { data } = await apiClient.post<SobrePaginado<ProductoAfectado>>(`${BASE}/eventos/vista-previa`, cuerpo, {
      params: { pagina, limite },
    });
    return { items: data.data, paginacion: data.pagination };
  },
  buscarReferencias: (tipo: TipoExclusion, busqueda: string, limite = 20) =>
    obtener<ReferenciaCatalogo[]>(`${BASE}/referencias`, { tipo, busqueda, limite }),
};

export const cuponesApi = {
  listar: (params: ParametrosConsulta) => obtenerPagina<Cupon>(`${BASE}/cupones`, params),
  crear: (cuerpo: CrearCuponRequest) => enviar<Cupon>('post', `${BASE}/cupones`, cuerpo),
  actualizar: (idCupon: number, cuerpo: ActualizarCuponRequest) =>
    enviar<Cupon>('put', `${BASE}/cupones/${idCupon}`, cuerpo),
  cambiarEstado: (idCupon: number, estado: Estado) =>
    enviar<Cupon>('patch', `${BASE}/cupones/${idCupon}/estado`, { estado } satisfies CambiarEstadoRequest),
  usos: (idCupon: number, params: ParametrosConsulta) =>
    obtenerPagina<UsoCupon>(`${BASE}/cupones/${idCupon}/usos`, params),
};

export const tiposClienteApi = {
  listar: () => obtener<TipoClienteEmpresa[]>(`${BASE}/tipos-cliente-empresa`),
  crear: (cuerpo: CrearTipoClienteRequest) =>
    enviar<TipoClienteEmpresa>('post', `${BASE}/tipos-cliente-empresa`, cuerpo),
  actualizar: (idSubRolEmpresa: number, cuerpo: CrearTipoClienteRequest) =>
    enviar<TipoClienteEmpresa>('put', `${BASE}/tipos-cliente-empresa/${idSubRolEmpresa}`, cuerpo),
  cambiarEstado: (idSubRolEmpresa: number, estado: Estado) =>
    enviar<TipoClienteEmpresa>('patch', `${BASE}/tipos-cliente-empresa/${idSubRolEmpresa}/estado`, {
      estado,
    } satisfies CambiarEstadoRequest),
};

export const simuladorApi = {
  simular: (cuerpo: SimularRequest) => enviar<Calculo>('post', `${BASE}/simular`, cuerpo),
};

/** Rutas públicas (sin sesión): lo que ve cualquier visitante en la pestaña «Ofertas». */
export const eventosPublicosApi = {
  enCurso: () => obtener<EventoPublico[]>('/precios/eventos-en-curso'),
};
