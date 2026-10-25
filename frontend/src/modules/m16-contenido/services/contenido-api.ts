import { apiClient } from '@/core/api/apiClient';
import type { RespuestaExitosa } from '@/core/types/respuesta-api.type';
import type {
  FaqFormValues,
  PaginaFormValues,
} from '../dtos/m16-contenido.dto';
import type {
  EstadoFaq,
  EstadoPaginaContenido,
  FaqAdminEntity,
  FaqPublicaItem,
  FiltroFaqAdmin,
  FiltroPaginasAdmin,
  PaginaAdminEntity,
  PaginaPublicaDetalle,
  PaginaPublicaResumen,
} from '../interfaces/contenido.interface';

/* ─── Endpoints Públicos (`/api/v1/contenido/*`) ──────────────────────────── */

export async function listarPaginasPublicas(): Promise<PaginaPublicaResumen[]> {
  const { data } = await apiClient.get<RespuestaExitosa<PaginaPublicaResumen[]>>(
    '/contenido/paginas',
  );
  return data.data;
}

export async function obtenerPaginaPublicaPorSlug(
  slug: string,
): Promise<PaginaPublicaDetalle> {
  const { data } = await apiClient.get<RespuestaExitosa<PaginaPublicaDetalle>>(
    `/contenido/paginas/${encodeURIComponent(slug)}`,
  );
  return data.data;
}

export async function listarFaqPublicas(): Promise<FaqPublicaItem[]> {
  const { data } =
    await apiClient.get<RespuestaExitosa<FaqPublicaItem[]>>('/contenido/faq');
  return data.data;
}

/* ─── Endpoints Administrativos (`/api/v1/admin/contenido/*`) ─────────────── */

export async function listarPaginasAdmin(
  filtro: FiltroPaginasAdmin = {},
): Promise<PaginaAdminEntity[]> {
  const params: Record<string, string> = {};
  if (filtro.estado) params.estado = filtro.estado;
  if (filtro.busqueda && filtro.busqueda.trim().length > 0) {
    params.busqueda = filtro.busqueda.trim();
  }
  const { data } = await apiClient.get<RespuestaExitosa<PaginaAdminEntity[]>>(
    '/admin/contenido/paginas',
    { params },
  );
  return data.data;
}

export async function crearPaginaAdmin(
  valores: PaginaFormValues,
): Promise<PaginaAdminEntity> {
  const { data } = await apiClient.post<RespuestaExitosa<PaginaAdminEntity>>(
    '/admin/contenido/paginas',
    {
      slug: valores.slug,
      titulo: valores.titulo,
      resumen: valores.resumen.trim().length > 0 ? valores.resumen.trim() : null,
      cuerpoMarkdown: valores.cuerpoMarkdown,
      estado: valores.estado,
    },
  );
  return data.data;
}

export async function editarPaginaAdmin(
  idPagina: number,
  valores: Omit<PaginaFormValues, 'estado'>,
): Promise<PaginaAdminEntity> {
  const { data } = await apiClient.put<RespuestaExitosa<PaginaAdminEntity>>(
    `/admin/contenido/paginas/${idPagina}`,
    {
      slug: valores.slug,
      titulo: valores.titulo,
      resumen: valores.resumen.trim().length > 0 ? valores.resumen.trim() : null,
      cuerpoMarkdown: valores.cuerpoMarkdown,
    },
  );
  return data.data;
}

export async function cambiarEstadoPaginaAdmin(
  idPagina: number,
  estado: EstadoPaginaContenido,
): Promise<PaginaAdminEntity> {
  const { data } = await apiClient.patch<RespuestaExitosa<PaginaAdminEntity>>(
    `/admin/contenido/paginas/${idPagina}/estado`,
    { estado },
  );
  return data.data;
}

export async function listarFaqAdmin(
  filtro: FiltroFaqAdmin = {},
): Promise<FaqAdminEntity[]> {
  const params: Record<string, string> = {};
  if (filtro.estado) params.estado = filtro.estado;
  if (filtro.busqueda && filtro.busqueda.trim().length > 0) {
    params.busqueda = filtro.busqueda.trim();
  }
  const { data } = await apiClient.get<RespuestaExitosa<FaqAdminEntity[]>>(
    '/admin/contenido/faq',
    { params },
  );
  return data.data;
}

export async function crearFaqAdmin(
  valores: FaqFormValues,
): Promise<FaqAdminEntity> {
  const { data } = await apiClient.post<RespuestaExitosa<FaqAdminEntity>>(
    '/admin/contenido/faq',
    valores,
  );
  return data.data;
}

export async function editarFaqAdmin(
  idFaq: number,
  valores: Omit<FaqFormValues, 'estado'>,
): Promise<FaqAdminEntity> {
  const { data } = await apiClient.put<RespuestaExitosa<FaqAdminEntity>>(
    `/admin/contenido/faq/${idFaq}`,
    valores,
  );
  return data.data;
}

export async function cambiarEstadoFaqAdmin(
  idFaq: number,
  estado: EstadoFaq,
): Promise<FaqAdminEntity> {
  const { data } = await apiClient.patch<RespuestaExitosa<FaqAdminEntity>>(
    `/admin/contenido/faq/${idFaq}/estado`,
    { estado },
  );
  return data.data;
}

export async function cambiarOrdenFaqAdmin(
  idFaq: number,
  orden: number,
): Promise<FaqAdminEntity> {
  const { data } = await apiClient.patch<RespuestaExitosa<FaqAdminEntity>>(
    `/admin/contenido/faq/${idFaq}/orden`,
    { orden },
  );
  return data.data;
}
