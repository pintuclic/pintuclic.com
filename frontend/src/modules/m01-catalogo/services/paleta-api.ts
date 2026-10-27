import { apiClient } from '@/core/api/apiClient';
import type { RespuestaExitosa } from '@/core/types/respuesta-api.type';
import type { ArmoniasColor, ListarPaletaRequest, Paleta } from '../dtos/m01-catalogo-paleta.dto';

const PUBLICO = '/catalogo/paleta';

export interface PaginaPaleta {
  colores: Paleta['colores'];
  familias: Paleta['familias'];
  marcas: Paleta['marcas'];
  paginacion: { pagina: number; limite: number; total: number; totalPaginas: number };
}

/** Paleta de color (público, sin sesión; contrato M01 · entrega 4). */
export const paletaApi = {
  colores: async (params: Partial<Omit<ListarPaletaRequest, 'pagina' | 'limite'>> & { pagina?: number; limite?: number }): Promise<PaginaPaleta> => {
    const limpio: Record<string, string | number> = {};
    for (const [clave, valor] of Object.entries(params)) {
      if (valor !== undefined && valor !== '') limpio[clave] = valor as string | number;
    }
    const { data } = await apiClient.get<{ success: true; data: Paleta; pagination: PaginaPaleta['paginacion'] }>(
      `${PUBLICO}/colores`,
      { params: limpio },
    );
    return { ...data.data, paginacion: data.pagination };
  },
  armonias: async (idColor: number): Promise<ArmoniasColor> => {
    const { data } = await apiClient.get<RespuestaExitosa<ArmoniasColor>>(`${PUBLICO}/colores/${idColor}/armonias`);
    return data.data;
  },
};
