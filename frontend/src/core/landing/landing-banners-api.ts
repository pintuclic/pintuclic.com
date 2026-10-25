import { apiClient } from '../api/apiClient';
import type { RespuestaExitosa } from '../types/respuesta-api.type';

export type EstadoBannerInicio = 'activo' | 'inactivo';
export type TipoMimeBannerInicio = 'image/jpeg' | 'image/png' | 'image/webp';

export interface BannerInicioPublico {
  idBanner: number;
  tituloLinea1: string;
  tituloLinea2: string | null;
  descripcion: string;
  textoBotonPrimario: string;
  enlaceBotonPrimario: string;
  textoBotonSecundario: string | null;
  enlaceBotonSecundario: string | null;
  tieneImagenPersonalizada: boolean;
  orden: number;
}

export interface BannerInicioAdmin extends BannerInicioPublico {
  estado: EstadoBannerInicio;
  idAutor: number | null;
  nombreAutor: string | null;
  fechaCreacion: string;
  fechaActualizacion: string;
}

export interface CrearBannerInicioPayload {
  tituloLinea1: string;
  tituloLinea2?: string | null;
  descripcion: string;
  textoBotonPrimario: string;
  enlaceBotonPrimario: string;
  textoBotonSecundario?: string | null;
  enlaceBotonSecundario?: string | null;
  imagenBase64?: string;
  imagenMimeType?: TipoMimeBannerInicio;
  orden?: number;
  estado?: EstadoBannerInicio;
}

export interface EditarBannerInicioPayload {
  tituloLinea1?: string;
  tituloLinea2?: string | null;
  descripcion?: string;
  textoBotonPrimario?: string;
  enlaceBotonPrimario?: string;
  textoBotonSecundario?: string | null;
  enlaceBotonSecundario?: string | null;
  imagenBase64?: string;
  imagenMimeType?: TipoMimeBannerInicio;
  orden?: number;
}

const RUTA_PUBLICA = '/landing/banners';
const RUTA_ADMIN = '/admin/landing/banners';

export const landingBannersPublicoApi = {
  async listar(): Promise<BannerInicioPublico[]> {
    const res = await apiClient.get<RespuestaExitosa<BannerInicioPublico[]>>(RUTA_PUBLICA);
    return res.data.data;
  },

  urlImagen(idBanner: number, marcaTiempo?: string): string {
    const base = apiClient.defaults.baseURL ?? '/api/v1';
    const sufijo = marcaTiempo ? `?v=${encodeURIComponent(marcaTiempo)}` : '';
    return `${base}${RUTA_PUBLICA}/${String(idBanner)}/imagen${sufijo}`;
  },
};

export const landingBannersAdminApi = {
  async listar(): Promise<BannerInicioAdmin[]> {
    const res = await apiClient.get<RespuestaExitosa<BannerInicioAdmin[]>>(RUTA_ADMIN);
    return res.data.data;
  },

  async crear(payload: CrearBannerInicioPayload): Promise<BannerInicioAdmin> {
    const res = await apiClient.post<RespuestaExitosa<BannerInicioAdmin>>(RUTA_ADMIN, payload);
    return res.data.data;
  },

  async editar(idBanner: number, payload: EditarBannerInicioPayload): Promise<BannerInicioAdmin> {
    const res = await apiClient.put<RespuestaExitosa<BannerInicioAdmin>>(
      `${RUTA_ADMIN}/${String(idBanner)}`,
      payload,
    );
    return res.data.data;
  },

  async cambiarEstado(
    idBanner: number,
    estado: EstadoBannerInicio,
  ): Promise<BannerInicioAdmin> {
    const res = await apiClient.patch<RespuestaExitosa<BannerInicioAdmin>>(
      `${RUTA_ADMIN}/${String(idBanner)}/estado`,
      { estado },
    );
    return res.data.data;
  },

  async eliminar(idBanner: number): Promise<void> {
    await apiClient.delete(`${RUTA_ADMIN}/${String(idBanner)}`);
  },
};
