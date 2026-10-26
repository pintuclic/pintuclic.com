import { apiClient } from '@/core/api/apiClient';
import type {
  CategoriaPublica,
  ColorOfrecido,
  FamiliaDisponible,
  FiltrosPublicos,
  OfertaVariante,
  ProductoPublicoFicha,
  ProductoPublicoTarjeta,
} from '../dtos/m01-catalogo-productos.dto';
import type { TamanoImagen } from '../dtos/m01-catalogo-entrega3.dto';
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
  /** Ofertas de las presentaciones; con color elegido se aplican las excepciones por color de los eventos. */
  ofertas: (idProducto: number, idColor?: number) =>
    obtener<OfertaVariante[]>(
      `${PUBLICO}/productos/${idProducto}/ofertas`,
      idColor === undefined ? undefined : { idColor },
    ),
  /** Los listados piden la miniatura y la ficha la versión mediana (I7). */
  urlImagen: (idImagen: number, tamano: TamanoImagen = 'original'): string =>
    `${apiClient.defaults.baseURL ?? '/api/v1'}${PUBLICO}/imagenes/${idImagen}${tamano === 'original' ? '' : `?tamano=${tamano}`}`,
  /** Hasta 4 sugerencias para la ficha; vacío = no mostrar la sección (HU-CAT-08). */
  complementarios: (idProducto: number) =>
    obtener<ProductoPublicoTarjeta[]>(`${PUBLICO}/productos/${idProducto}/complementarios`),
  urlImagenMedida: (idMedida: number): string =>
    `${apiClient.defaults.baseURL ?? '/api/v1'}${PUBLICO}/medidas/${idMedida}/imagen`,
  urlLogotipo: (idMarca: number): string =>
    `${apiClient.defaults.baseURL ?? '/api/v1'}${PUBLICO}/marcas/${idMarca}/logotipo`,
};
