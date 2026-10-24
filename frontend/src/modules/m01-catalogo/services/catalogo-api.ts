import { apiClient } from '@/core/api/apiClient';
import type { RespuestaExitosa } from '@/core/types/respuesta-api.type';
import type {
  Acabado,
  Base,
  CambiarEstadoRequest,
  Categoria,
  CrearCategoriaRequest,
  CrearLineaRequest,
  CrearMarcaRequest,
  CrearMedidaRequest,
  CrearTipoMedidaRequest,
  EditarLineaRequest,
  EditarMarcaRequest,
  EditarMedidaRequest,
  EditarTipoMedidaRequest,
  Estado,
  FamiliaColor,
  ImpactoDesactivacion,
  Linea,
  Marca,
  Medida,
  ReemplazarLogotipoRequest,
  Subcategoria,
  Superficie,
  TipoMedida,
  TipoResina,
} from '../dtos/m01-catalogo.dto';
import type {
  CambiarEstadoProductoRequest,
  Color,
  CrearColorRequest,
  CrearProductoRequest,
  CrearVarianteRequest,
  EditarColorRequest,
  EditarProductoRequest,
  EditarVarianteRequest,
  ImportarColoresRequest,
  ColorOfrecido,
  FamiliaDisponible,
  ProductoDetalle,
  ProductoResumen,
  Variante,
} from '../dtos/m01-catalogo-productos.dto';
import type { PaginaApi, PaginaColoresApi, PaginacionApi, ParametrosConsulta } from '../interfaces/catalogo.interface';

const BASE = '/admin/catalogo';

interface SobrePaginado<T> {
  success: true;
  data: T[];
  pagination: PaginacionApi;
}

interface SobreColores extends SobrePaginado<ColorOfrecido> {
  familias: FamiliaDisponible[];
}

/** Quita las claves sin valor: un filtro vacío no viaja en la URL. */
export function limpiarParametros(params: ParametrosConsulta): Record<string, string | number | boolean> {
  const limpio: Record<string, string | number | boolean> = {};
  for (const [clave, valor] of Object.entries(params)) {
    if (valor !== undefined && valor !== '') limpio[clave] = valor;
  }
  return limpio;
}

export async function obtener<T>(ruta: string, params: ParametrosConsulta = {}): Promise<T> {
  const { data } = await apiClient.get<RespuestaExitosa<T>>(ruta, { params: limpiarParametros(params) });
  return data.data;
}

export async function obtenerPagina<T>(ruta: string, params: ParametrosConsulta = {}): Promise<PaginaApi<T>> {
  const { data } = await apiClient.get<SobrePaginado<T>>(ruta, { params: limpiarParametros(params) });
  return { items: data.data, paginacion: data.pagination };
}

export async function enviar<T>(metodo: 'post' | 'put' | 'patch', ruta: string, cuerpo: unknown): Promise<T> {
  const { data } = await apiClient.request<RespuestaExitosa<T>>({ method: metodo, url: ruta, data: cuerpo });
  return data.data;
}

/* ─── Recursos con la forma común: lista · alta · edición · estado · impacto ─── */

export interface RecursoAdmin<E, Crear, Editar, Lista> {
  listar: (params?: ParametrosConsulta) => Promise<Lista>;
  crear: (cuerpo: Crear) => Promise<E>;
  editar: (id: number, cuerpo: Editar) => Promise<E>;
  cambiarEstado: (id: number, cuerpo: CambiarEstadoRequest) => Promise<E>;
  impacto: (id: number) => Promise<ImpactoDesactivacion>;
}

function recursoSimple<E, Crear, Editar>(ruta: string): RecursoAdmin<E, Crear, Editar, E[]> {
  return {
    listar: (params) => obtener<E[]>(`${BASE}/${ruta}`, params),
    crear: (cuerpo) => enviar<E>('post', `${BASE}/${ruta}`, cuerpo),
    editar: (id, cuerpo) => enviar<E>('put', `${BASE}/${ruta}/${id}`, cuerpo),
    cambiarEstado: (id, cuerpo) => enviar<E>('patch', `${BASE}/${ruta}/${id}/estado`, cuerpo),
    impacto: (id) => obtener<ImpactoDesactivacion>(`${BASE}/${ruta}/${id}/impacto-desactivacion`),
  };
}

function recursoPaginado<E, Crear, Editar>(ruta: string): RecursoAdmin<E, Crear, Editar, PaginaApi<E>> {
  return {
    listar: (params) => obtenerPagina<E>(`${BASE}/${ruta}`, params),
    crear: (cuerpo) => enviar<E>('post', `${BASE}/${ruta}`, cuerpo),
    editar: (id, cuerpo) => enviar<E>('put', `${BASE}/${ruta}/${id}`, cuerpo),
    cambiarEstado: (id, cuerpo) => enviar<E>('patch', `${BASE}/${ruta}/${id}/estado`, cuerpo),
    impacto: (id) => obtener<ImpactoDesactivacion>(`${BASE}/${ruta}/${id}/impacto-desactivacion`),
  };
}

interface CuerpoNombre {
  nombre?: string;
  orden?: number;
}
interface CuerpoFamilia extends CuerpoNombre {
  hexadecimal?: string;
}

export const superficiesApi = recursoSimple<Superficie, CuerpoNombre, CuerpoNombre>('superficies');
export const tiposResinaApi = recursoSimple<TipoResina, CuerpoNombre, CuerpoNombre>('tipos-resina');
export const acabadosApi = recursoSimple<Acabado, CuerpoNombre, CuerpoNombre>('acabados');
export const basesApi = recursoSimple<Base, CuerpoNombre, CuerpoNombre>('bases');
export const familiasColorApi = recursoSimple<FamiliaColor, CuerpoFamilia, CuerpoFamilia>('familias-color');
export const tiposMedidaApi = recursoSimple<TipoMedida, CrearTipoMedidaRequest, EditarTipoMedidaRequest>(
  'tipos-medida',
);
export const lineasApi = recursoPaginado<Linea, CrearLineaRequest, EditarLineaRequest>('lineas');
export const medidasApi = recursoPaginado<Medida, CrearMedidaRequest, EditarMedidaRequest>('medidas');
export const coloresApi = recursoPaginado<Color, CrearColorRequest, EditarColorRequest>('colores');

/* ─── Categorías y subcategorías ─── */

export const categoriasApi = {
  listar: (estado?: Estado) => obtener<Categoria[]>(`${BASE}/categorias`, { estado }),
  crear: (cuerpo: CrearCategoriaRequest) => enviar<Categoria>('post', `${BASE}/categorias`, cuerpo),
  editar: (id: number, cuerpo: Partial<CrearCategoriaRequest>) =>
    enviar<Categoria>('put', `${BASE}/categorias/${id}`, cuerpo),
  cambiarEstado: (id: number, cuerpo: CambiarEstadoRequest) =>
    enviar<Categoria>('patch', `${BASE}/categorias/${id}/estado`, cuerpo),
  impacto: (id: number) => obtener<ImpactoDesactivacion>(`${BASE}/categorias/${id}/impacto-desactivacion`),
};

export const subcategoriasApi = {
  crear: (idCategoria: number, cuerpo: CrearCategoriaRequest) =>
    enviar<Subcategoria>('post', `${BASE}/categorias/${idCategoria}/subcategorias`, cuerpo),
  editar: (id: number, cuerpo: Partial<CrearCategoriaRequest>) =>
    enviar<Subcategoria>('put', `${BASE}/subcategorias/${id}`, cuerpo),
  cambiarEstado: (id: number, cuerpo: CambiarEstadoRequest) =>
    enviar<Subcategoria>('patch', `${BASE}/subcategorias/${id}/estado`, cuerpo),
  impacto: (id: number) => obtener<ImpactoDesactivacion>(`${BASE}/subcategorias/${id}/impacto-desactivacion`),
};

/* ─── Marcas ─── */

export const marcasApi = {
  ...recursoPaginado<Marca, CrearMarcaRequest, EditarMarcaRequest>('marcas'),
  reemplazarLogotipo: (id: number, cuerpo: ReemplazarLogotipoRequest) =>
    enviar<Marca>('put', `${BASE}/marcas/${id}/logotipo`, cuerpo),
  /** URL del logotipo en administración (requiere sesión; el navegador envía la cookie). */
  urlLogotipo: (id: number): string => `${apiClient.defaults.baseURL ?? '/api/v1'}${BASE}/marcas/${id}/logotipo`,
};

/* ─── Colores: importación por bloques (C8) ─── */

export const importacionColoresApi = {
  previsualizar: (cuerpo: ImportarColoresRequest) =>
    enviar<ResultadoImportacionApi>('post', `${BASE}/colores/importar/previsualizar`, cuerpo),
  aplicar: (cuerpo: ImportarColoresRequest) =>
    enviar<ResultadoImportacionApi>('post', `${BASE}/colores/importar/aplicar`, cuerpo),
};

export interface ResultadoImportacionApi {
  aplicada: boolean;
  balance: {
    total: number;
    creadas: number;
    actualizadas: number;
    sinCambios: number;
    rechazadas: number;
    sinBase: number;
  };
  filas: Array<{
    indice: number;
    resultado: 'creada' | 'actualizada' | 'sin_cambios' | 'rechazada';
    idColor: number | null;
    motivoRechazo: string | null;
    sinBase: boolean;
  }>;
}

/* ─── Productos y variantes ─── */

export const productosApi = {
  listar: (params?: ParametrosConsulta) => obtenerPagina<ProductoResumen>(`${BASE}/productos`, params),
  obtener: (id: number) => obtener<ProductoDetalle>(`${BASE}/productos/${id}`),
  crear: (cuerpo: CrearProductoRequest) => enviar<ProductoDetalle>('post', `${BASE}/productos`, cuerpo),
  editar: (id: number, cuerpo: EditarProductoRequest) =>
    enviar<ProductoDetalle>('put', `${BASE}/productos/${id}`, cuerpo),
  cambiarEstado: (id: number, cuerpo: CambiarEstadoProductoRequest) =>
    enviar<ProductoDetalle>('patch', `${BASE}/productos/${id}/estado`, cuerpo),
  publicar: (id: number, publicado: boolean) =>
    enviar<ProductoDetalle>('patch', `${BASE}/productos/${id}/publicacion`, { publicado }),
  impacto: (id: number) => obtener<ImpactoDesactivacion>(`${BASE}/productos/${id}/impacto-desactivacion`),
};

export const variantesApi = {
  crear: (idProducto: number, cuerpo: CrearVarianteRequest) =>
    enviar<Variante>('post', `${BASE}/productos/${idProducto}/variantes`, cuerpo),
  editar: (id: number, cuerpo: EditarVarianteRequest) => enviar<Variante>('put', `${BASE}/variantes/${id}`, cuerpo),
  cambiarEstado: (id: number, cuerpo: CambiarEstadoProductoRequest) =>
    enviar<Variante>('patch', `${BASE}/variantes/${id}/estado`, cuerpo),
  impacto: (id: number) => obtener<ImpactoDesactivacion>(`${BASE}/variantes/${id}/impacto-desactivacion`),
};

/** Carta de colores de un producto, en administración o en la vitrina (misma forma). */
export async function obtenerColoresProducto(
  ruta: string,
  params: ParametrosConsulta = {},
): Promise<PaginaColoresApi<ColorOfrecido, FamiliaDisponible>> {
  const { data } = await apiClient.get<SobreColores>(ruta, { params: limpiarParametros(params) });
  return { items: data.data, paginacion: data.pagination, familias: data.familias };
}

export const coloresProductoAdminApi = (idProducto: number, params?: ParametrosConsulta) =>
  obtenerColoresProducto(`${BASE}/productos/${idProducto}/colores`, params);
