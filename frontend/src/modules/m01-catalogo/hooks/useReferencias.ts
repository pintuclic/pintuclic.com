'use client';

import { useCallback } from 'react';
import type {
  Acabado,
  Base,
  Categoria,
  FamiliaColor,
  Marca,
  Medida,
  Superficie,
  TipoMedida,
  TipoResina,
} from '../dtos/m01-catalogo.dto';
import {
  acabadosApi,
  basesApi,
  categoriasApi,
  familiasColorApi,
  marcasApi,
  medidasApi,
  superficiesApi,
  tiposMedidaApi,
  tiposResinaApi,
} from '../services/catalogo-api';
import { useCargar } from './useCargar';

export interface Referencias {
  marcas: Marca[];
  bases: Base[];
  acabados: Acabado[];
  familias: FamiliaColor[];
  superficies: Superficie[];
  resinas: TipoResina[];
  categorias: Categoria[];
  medidas: Medida[];
  tiposMedida: TipoMedida[];
}

/**
 * Catálogos que alimentan los selectores de los formularios (D5: los pequeños llegan
 * completos). Marcas y medidas van paginadas en la API; se piden hasta 100 activas.
 */
export function useReferencias(): { referencias: Referencias | null; error: string | null; recargar: () => void } {
  const cargador = useCallback(async (): Promise<Referencias> => {
    const [marcas, bases, acabados, familias, superficies, resinas, categorias, medidas, tiposMedida] =
      await Promise.all([
        marcasApi.listar({ estado: 'activo', limite: 100 }),
        basesApi.listar({ estado: 'activo' }),
        acabadosApi.listar({ estado: 'activo' }),
        familiasColorApi.listar({ estado: 'activo' }),
        superficiesApi.listar({ estado: 'activo' }),
        tiposResinaApi.listar({ estado: 'activo' }),
        categoriasApi.listar('activo'),
        medidasApi.listar({ estado: 'activo', limite: 100 }),
        tiposMedidaApi.listar({ estado: 'activo' }),
      ]);
    return {
      marcas: marcas.items,
      bases,
      acabados,
      familias,
      superficies,
      resinas,
      categorias,
      medidas: medidas.items,
      tiposMedida,
    };
  }, []);
  const { datos, error, recargar } = useCargar(cargador, 'No se pudieron cargar los catálogos de apoyo.');
  return { referencias: datos, error, recargar };
}
