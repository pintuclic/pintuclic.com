import { apiClient } from '@/core/api/apiClient';
import type {
  CategoriaPublica,
  ColorOfrecido,
  FamiliaDisponible,
  FiltrosPublicos,
  ProductoPublicoFicha,
  ProductoPublicoTarjeta,
} from '../dtos/m01-catalogo-productos.dto';
import type { PaginaApi, PaginaColoresApi, ParametrosConsulta } from '../interfaces/catalogo.interface';
import { obtener, obtenerColoresProducto, obtenerPagina } from './catalogo-api';

/** Consulta pública del catálogo (HU-CAT-06): sin sesión, solo lectura. */
const PUBLICO = '/catalogo';

export const catalogoPublicoApi = {
  categorias: () => obtener<CategoriaPublica[]>(`${PUBLICO}/categorias`),
  filtros: () => obtener<FiltrosPublicos>(`${PUBLICO}/filtros`),
  productos: (params?: ParametrosConsulta): Promise<PaginaApi<ProductoPublicoTarjeta>> =>
    obtenerPagina<ProductoPublicoTarjeta>(`${PUBLICO}/productos`, params),
  ficha: (idProducto: number) => obtener<ProductoPublicoFicha>(`${PUBLICO}/productos/${idProducto}`),
  colores: (
    idProducto: number,
    params?: ParametrosConsulta,
  ): Promise<PaginaColoresApi<ColorOfrecido, FamiliaDisponible>> =>
    obtenerColoresProducto(`${PUBLICO}/productos/${idProducto}/colores`, params),
  urlImagen: (idImagen: number): string => `${apiClient.defaults.baseURL ?? '/api/v1'}${PUBLICO}/imagenes/${idImagen}`,
  urlImagenMedida: (idMedida: number): string =>
    `${apiClient.defaults.baseURL ?? '/api/v1'}${PUBLICO}/medidas/${idMedida}/imagen`,
  urlLogotipo: (idMarca: number): string =>
    `${apiClient.defaults.baseURL ?? '/api/v1'}${PUBLICO}/marcas/${idMarca}/logotipo`,
};
