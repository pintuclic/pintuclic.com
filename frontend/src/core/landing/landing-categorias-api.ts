import { apiClient } from '../api/apiClient';
import type { RespuestaExitosa } from '../types/respuesta-api.type';
import type { TipoMimeBannerInicio } from './landing-banners-api';

/** Una categoría del inicio que tiene imagen propia (público). `version` cambia con cada edición. */
export interface CategoriaInicioPublica {
  idCategoria: number;
  focoX: number;
  focoY: number;
  version: string;
}

export interface CategoriaInicioAdmin {
  idCategoria: number;
  nombre: string;
  tieneImagen: boolean;
  focoX: number;
  focoY: number;
  fechaActualizacion: string | null;
}

export interface GuardarImagenCategoriaPayload {
  imagenBase64?: string;
  imagenMimeType?: TipoMimeBannerInicio;
  focoX?: number;
  focoY?: number;
}

const RUTA_PUBLICA = '/landing/categorias';
const RUTA_ADMIN = '/admin/landing/categorias';

export const landingCategoriasPublicoApi = {
  async listar(): Promise<CategoriaInicioPublica[]> {
    const res = await apiClient.get<RespuestaExitosa<CategoriaInicioPublica[]>>(RUTA_PUBLICA);
    return res.data.data;
  },

  /** El enlace lleva la versión: cuando la imagen cambia, el navegador pide la nueva y no reutiliza la vieja. */
  urlImagen(idCategoria: number, version: string): string {
    const base = apiClient.defaults.baseURL ?? '/api/v1';
    return `${base}${RUTA_PUBLICA}/${String(idCategoria)}/imagen?v=${encodeURIComponent(version)}`;
  },
};

export const landingCategoriasAdminApi = {
  async listar(): Promise<CategoriaInicioAdmin[]> {
    const res = await apiClient.get<RespuestaExitosa<CategoriaInicioAdmin[]>>(RUTA_ADMIN);
    return res.data.data;
  },

  async guardar(idCategoria: number, payload: GuardarImagenCategoriaPayload): Promise<CategoriaInicioAdmin> {
    const res = await apiClient.put<RespuestaExitosa<CategoriaInicioAdmin>>(`${RUTA_ADMIN}/${String(idCategoria)}/imagen`, payload);
    return res.data.data;
  },

  async quitar(idCategoria: number): Promise<void> {
    await apiClient.delete(`${RUTA_ADMIN}/${String(idCategoria)}/imagen`);
  },
};
